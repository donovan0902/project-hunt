import { mutation, action, internalQuery } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { rag } from "../rag";
import type { Id } from "../_generated/dataModel";
import type { EntryId } from "@convex-dev/rag";
import { calculateHotScore } from "./helpers";
import { propagateHotScoreToMemberships } from "./spaces";
import { parseMentionsFromHtml } from "../mentions";
import { emitNotificationEvent } from "../notificationEngine";

export const getCurrentUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_externalUserId", (q) => q.eq("externalUserId", identity.subject))
      .unique();
  },
});

export const getProject = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const getProjectsByEntryIds = internalQuery({
  args: {
    entryIds: v.array(v.string()),
    excludeProjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const projects = await Promise.all(
      args.entryIds.map(async (entryId) => {
        return await ctx.db
          .query("projects")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();
      })
    );
    return projects.filter(
      (p): p is NonNullable<typeof p> =>
        p !== undefined &&
        p !== null &&
        (!args.excludeProjectId || p._id !== args.excludeProjectId)
    );
  },
});

export const populateProjectDetails = internalQuery({
  args: {
    projects: v.array(
      v.object({
        _id: v.id("projects"),
        name: v.string(),
        summary: v.optional(v.string()),
        teamId: v.optional(v.id("teams")),
        entryId: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("active")),
        userId: v.id("users"),
        _creationTime: v.number(),
        allFields: v.optional(v.string()),
        links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
        readinessStatus: v.optional(v.union(v.literal("in_progress"), v.literal("just_an_idea"), v.literal("early_prototype"), v.literal("mostly_working"), v.literal("ready_to_use"))),
        pinned: v.optional(v.boolean()),
        engagementScore: v.optional(v.number()),
        hotScore: v.optional(v.number()),
        viewCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const projectsWithCounts = await Promise.all(
      args.projects.map(async (project) => {
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const creator = await ctx.db.get(project.userId);
        let teamName = "";
        if (project.teamId) {
          const team = await ctx.db.get(project.teamId);
          teamName = team?.name ?? "";
        }
        return {
          _id: project._id,
          name: project.name,
          summary: project.summary,
          team: teamName,
          upvotes: upvotes.length,
          creatorId: project.userId,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
        };
      })
    );
    return projectsWithCounts;
  },
});

export const createProject = internalMutationFromFunctions({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.id("users"),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    readinessStatus: v.union(v.literal("just_an_idea"), v.literal("early_prototype"), v.literal("mostly_working"), v.literal("ready_to_use")),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let teamId: Id<"teams"> | undefined = undefined;
    const user = await ctx.db.get(args.userId);
    if (user?.teamId) {
      teamId = user.teamId;
    }
    return await ctx.db.insert("projects", {
      name: args.name,
      summary: args.summary,
      teamId,
      viewCount: 0,
      status: args.status,
      userId: args.userId,
      links: args.links,
      readinessStatus: args.readinessStatus,
      pinned: args.pinned ?? false,
    });
  },
});

export const updateEntryId = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { entryId: args.entryId });
  },
});

export const deleteProject = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
  },
});

export const updateProjectFields = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    readinessStatus: v.union(v.literal("just_an_idea"), v.literal("early_prototype"), v.literal("mostly_working"), v.literal("ready_to_use")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      name: args.name,
      summary: args.summary,
      links: args.links,
      readinessStatus: args.readinessStatus,
    });
  },
});

export const confirmProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.status !== "pending") {
      throw new Error("Project is not pending");
    }
    const now = Date.now();
    const hotScore = calculateHotScore(project.engagementScore ?? 0, project._creationTime, now);
    await ctx.db.patch(args.projectId, {
      status: "active" as const,
      hotScore,
    });

    // Propagate hotScore to membership rows
    await propagateHotScoreToMemberships(ctx, args.projectId, hotScore);

    // Notify followers of all spaces this project belongs to
    const membershipRows = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const row of membershipRows) {
      await emitNotificationEvent(ctx, {
        type: "project_added_to_space",
        projectId: args.projectId,
        focusAreaId: row.focusAreaId,
        actorUserId: project.userId,
        contentTitle: project.name,
      });
    }

    // Inject into all users' personalized feeds immediately
    await ctx.scheduler.runAfter(
      0,
      internal.userAffinities.injectNewProjectIntoFeeds,
      { projectId: args.projectId }
    );

    // Process @mentions in the description when project goes live
    if (project.summary) {
      const mentionedUserIds = parseMentionsFromHtml(project.summary);
      if (mentionedUserIds.length > 0) {
        await emitNotificationEvent(ctx, {
          type: "mention",
          actorUserId: project.userId,
          mentionedUserIds,
          contentType: "project",
          contentId: args.projectId as string,
          contentTitle: project.name,
          projectId: args.projectId,
          excludeUserIds: [],
        });
      }
    }
  },
});

export const create = action({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    focusAreaId: v.optional(v.id("focusAreas")),
    additionalFocusAreaIds: v.optional(v.array(v.id("focusAreas"))),
    readinessStatus: v.union(v.literal("just_an_idea"), v.literal("early_prototype"), v.literal("mostly_working"), v.literal("ready_to_use")),
  },
  handler: async (ctx, args): Promise<{
    projectId: Id<"projects">;
    similarProjects: Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
      team: string;
      upvotes: number;
    }>;
  }> => {
    const user = await ctx.runQuery(internal.projects.getCurrentUserInternal, {});
    if (!user) {
      throw new Error("Unauthorized");
    }
    const projectId: Id<"projects"> = await ctx.runMutation(
      internal.projects.createProject,
      {
        name: args.name,
        summary: args.summary,
        links: args.links,
        readinessStatus: args.readinessStatus,
        status: "pending" as const,
        userId: user._id,
      }
    );
    // Sync space memberships (primary + secondary)
    await ctx.runMutation(internal.projects.syncProjectSpaceMemberships, {
      projectId,
      primaryFocusAreaId: args.focusAreaId,
      additionalFocusAreaIds: args.additionalFocusAreaIds ?? [],
      hotScore: 0,
    });

    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: projectId,
    });
    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId,
      entryId,
    });
    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });
    const similarProjectsRaw = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: projectId,
      }
    );
    const similarProjects = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjectsRaw }
    );
    return { projectId, similarProjects };
  },
});

export const updateProject = action({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    focusAreaId: v.optional(v.id("focusAreas")),
    additionalFocusAreaIds: v.optional(v.array(v.id("focusAreas"))),
    readinessStatus: v.union(v.literal("just_an_idea"), v.literal("early_prototype"), v.literal("mostly_working"), v.literal("ready_to_use")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.projects.getCurrentUserInternal, {});
    if (!user) {
      throw new Error("Unauthorized");
    }
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    await ctx.runMutation(internal.projects.updateProjectFields, {
      projectId: args.projectId,
      name: args.name,
      summary: args.summary,
      links: args.links,
      readinessStatus: args.readinessStatus,
    });

    // Sync space memberships (primary + secondary)
    await ctx.runMutation(internal.projects.syncProjectSpaceMemberships, {
      projectId: args.projectId,
      primaryFocusAreaId: args.focusAreaId,
      additionalFocusAreaIds: args.additionalFocusAreaIds ?? [],
      hotScore: project.hotScore ?? 0,
    });

    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: args.projectId,
    });
    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId: args.projectId,
      entryId,
    });
    await ctx.runMutation(internal.notificationEngine.processProjectUpdate, {
      projectId: args.projectId,
      actorUserId: user._id,
    });

    // Process @mentions in the description (only notify newly-added mentions)
    await ctx.runMutation(internal.projects.processDescriptionMentions, {
      projectId: args.projectId,
      actorUserId: user._id,
      newSummary: args.summary,
      oldSummary: project.summary,
    });
  },
});

/**
 * Cascade-deletes every child row of a project in a single transaction and
 * returns the storage IDs + RAG entry ID that the caller (an action) must
 * clean up outside the transaction. Does NOT delete the project row itself —
 * the orchestrating action does that last so the project remains queryable
 * while orphaned media/RAG are still being torn down.
 */
export const cascadeDeleteProjectChildren = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const storageIds: Id<"_storage">[] = [];

    // mediaFiles
    const media = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const row of media) {
      storageIds.push(row.storageId);
      await ctx.db.delete(row._id);
    }

    // projectFiles
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const row of files) {
      storageIds.push(row.storageId);
      await ctx.db.delete(row._id);
    }

    // projectVersions + versionFiles
    const versions = await ctx.db
      .query("projectVersions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const version of versions) {
      const vFiles = await ctx.db
        .query("versionFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .collect();
      for (const vf of vFiles) {
        storageIds.push(vf.storageId);
        await ctx.db.delete(vf._id);
      }
      await ctx.db.delete(version._id);
    }

    // upvotes
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(upvotes.map((u) => ctx.db.delete(u._id)));

    // adoptions
    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(adoptions.map((a) => ctx.db.delete(a._id)));

    // projectViews
    const views = await ctx.db
      .query("projectViews")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(views.map((v) => ctx.db.delete(v._id)));

    // linkClickCounts
    const clicks = await ctx.db
      .query("linkClickCounts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(clicks.map((c) => ctx.db.delete(c._id)));

    // comments + commentUpvotes
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const comment of comments) {
      const cUpvotes = await ctx.db
        .query("commentUpvotes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      await Promise.all(cUpvotes.map((u) => ctx.db.delete(u._id)));
      await ctx.db.delete(comment._id);
    }

    // notifications scoped to this project
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(notifs.map((n) => ctx.db.delete(n._id)));

    // userFeedEntries
    const feedEntries = await ctx.db
      .query("userFeedEntries")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(feedEntries.map((f) => ctx.db.delete(f._id)));

    // projectSpaces membership rows
    const memberships = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    await Promise.all(memberships.map((m) => ctx.db.delete(m._id)));

    // userAffinities.engagedProjectIds is an array on every user doc; we rely
    // on the 6-hour refreshAllFeeds cron (see CLAUDE.md note 36) to scrub
    // stale ids rather than scanning every user synchronously here.

    return { storageIds };
  },
});

export const deleteProjectCascade = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.projects.getCurrentUserInternal, {});
    if (!user) {
      throw new Error("Unauthorized");
    }
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only delete your own projects");
    }

    const { storageIds } = await ctx.runMutation(
      internal.projects.cascadeDeleteProjectChildren,
      { projectId: args.projectId }
    );

    await Promise.all(
      storageIds.map((id) => ctx.storage.delete(id).catch(() => undefined))
    );

    if (project.entryId) {
      await rag.delete(ctx, { entryId: project.entryId as EntryId });
    }

    await ctx.runMutation(internal.projects.deleteProject, {
      projectId: args.projectId,
    });
  },
});

export const cancelProject = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<void> => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.status !== "pending") {
      throw new Error("Can only cancel pending projects");
    }
    await ctx.runAction(api.projects.deleteProjectCascade, {
      projectId: args.projectId,
    });
  },
});

export const backfillProject = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<{ message: string; entryId: string }> => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.entryId) {
      return { message: "Project already has an embedding", entryId: project.entryId };
    }
    const text = project.summary ? `${project.name}\n\n${project.summary}` : project.name;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: args.projectId,
    });
    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId: args.projectId,
      entryId,
    });
    return { message: "Project successfully backfilled", entryId };
  },
});

export const processDescriptionMentions = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
    actorUserId: v.id("users"),
    newSummary: v.optional(v.string()),
    oldSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.newSummary) return;

    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const newMentions = parseMentionsFromHtml(args.newSummary);
    const oldMentions = new Set(parseMentionsFromHtml(args.oldSummary ?? ""));
    const addedMentions = newMentions.filter((id) => !oldMentions.has(id));

    if (addedMentions.length > 0) {
      await emitNotificationEvent(ctx, {
        type: "mention",
        actorUserId: args.actorUserId,
        mentionedUserIds: addedMentions,
        contentType: "project",
        contentId: args.projectId as string,
        contentTitle: project.name,
        projectId: args.projectId,
        excludeUserIds: [],
      });
    }
  },
});

export const backfillEngagementScores = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("engagementScore"), undefined))
      .take(100);
    for (const project of projects) {
      const upvoteCount = (
        await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
      ).length;
      const commentCount = (
        await ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect()
      ).length;
      await ctx.db.patch(project._id, {
        engagementScore: upvoteCount + commentCount,
      });
    }
    return projects.length;
  },
});
