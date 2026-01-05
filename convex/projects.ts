import { mutation, query, action, internalQuery } from "./_generated/server";
// custom internal mutation for trigger that updates allFields field for projects for full text search
// this internal mutation will be a wrapper for the createProject and updateProjectFields internal mutations
import { internalMutation } from "./functions";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import type { Id, Doc } from "./_generated/dataModel";
import type { EntryId } from "@convex-dev/rag";
import type { QueryCtx } from "./_generated/server";
import { getCurrentUserOrThrow, getCurrentUser } from "./users";
import { hybridRank } from "@convex-dev/rag";
import {
  createProjectNotification,
  syncUpvoteNotification,
  upsertUpvoteNotification,
} from "./notifications";

// Hot score calculation constants (HN-style algorithm)
const HOT_SCORE_GRAVITY = 1.0; // Slow decay: projects visible 2-3 weeks
const HOT_SCORE_AGE_OFFSET = 2; // Prevents division issues for new posts

/**
 * Calculate HN-style hot score for a project
 * Formula: (score + 1) / (age_hours + 2)^gravity
 */
export function calculateHotScore(
  engagementScore: number,
  creationTime: number,
  now: number = Date.now()
): number {
  const ageHours = (now - creationTime) / (1000 * 60 * 60);
  return (engagementScore + 1) / Math.pow(ageHours + HOT_SCORE_AGE_OFFSET, HOT_SCORE_GRAVITY);
}

// Helper function to enrich projects with computed data
async function enrichProjects(
  ctx: QueryCtx,
  projects: Doc<"projects">[],
  userId: Id<"users"> | undefined
) {
  // Preload all focus areas referenced by these projects for quick lookup
  const focusAreaIds = Array.from(
    new Set(projects.flatMap((project) => project.focusAreaIds))
  );
  const focusAreaDocs = await Promise.all(
    focusAreaIds.map((id) => ctx.db.get(id))
  );
  const focusAreaMap = new Map(
    focusAreaDocs
      .filter((fa): fa is NonNullable<typeof fa> => fa !== null)
      .map((fa) => [fa._id, fa])
  );

  // Enrich each project with computed data
  return Promise.all(
    projects.map(async (project) => {
      const [upvotes, comments, creator, team, mediaFiles, adoptions] = await Promise.all([
        ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect(),
        ctx.db.get(project.userId),
        project.teamId ? ctx.db.get(project.teamId) : Promise.resolve(null),
        ctx.db
          .query("mediaFiles")
          .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
          .order("asc")
          .collect(),
        ctx.db
          .query("adoptions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .order("desc")
          .collect(),
      ]);

      const previewMedia = await Promise.all(
        mediaFiles.map(async (media) => ({
          _id: media._id,
          storageId: media.storageId,
          type: media.type,
          url: await ctx.storage.getUrl(media.storageId),
        }))
      );

      const focusAreas = project.focusAreaIds
        .map((id) => focusAreaMap.get(id))
        .filter((fa): fa is NonNullable<typeof fa> => fa !== undefined)
        .map((fa) => ({
          _id: fa._id,
          name: fa.name,
          group: fa.group,
        }));

      // Get top 4 adopters with user info for facepile
      const adoptersWithInfo = await Promise.all(
        adoptions.slice(0, 4).map(async (adoption) => {
          const user = await ctx.db.get(adoption.userId);
          return {
            _id: adoption.userId,
            name: user?.name ?? "Unknown User",
            avatarUrl: user?.avatarUrlId ?? "",
          };
        })
      );

      return {
        ...project,
        team: team?.name ?? "",
        upvotes: upvotes.length,
        viewCount: project.viewCount ?? 0,
        commentCount: comments.length,
        hasUpvoted: userId ? upvotes.some((u) => u.userId === userId) : false,
        creatorName: creator?.name ?? "Unknown User",
        creatorAvatar: creator?.avatarUrlId ?? "",
        focusAreas,
        previewMedia,
        adoptionCount: adoptions.length,
        adopters: adoptersWithInfo,
        hasAdopted: userId ? adoptions.some((a) => a.userId === userId) : false,
      };
    })
  );
}

// Internal query to get current user for use in actions
export const getCurrentUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
      .unique();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMediaUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const addMediaToProject = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only allow the project creator to add media
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }

    // Get current max order for this project
    const existingMedia = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = existingMedia.length > 0
      ? Math.max(...existingMedia.map(m => m.order))
      : -1;

    // Add new media with next order
    return await ctx.db.insert("mediaFiles", {
      projectId: args.projectId,
      storageId: args.storageId,
      type: args.type,
      contentType: args.contentType,
      order: maxOrder + 1,
      uploadedAt: Date.now(),
    });
  },
});

export const deleteMediaFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    mediaId: v.id("mediaFiles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only allow the project creator to delete media
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }

    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // Delete from storage
    await ctx.storage.delete(media.storageId);

    // Delete media record
    await ctx.db.delete(args.mediaId);
  },
});

export const getProjectMedia = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const mediaFiles = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project_ordered", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();

    // Pre-fetch URLs for all media items
    return await Promise.all(
      mediaFiles.map(async (media) => ({
        _id: media._id,
        storageId: media.storageId,
        type: media.type,
        url: await ctx.storage.getUrl(media.storageId),
      }))
    );
  },
});

export const create = action({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
    link: v.optional(v.string()),
    focusAreaIds: v.array(v.id("focusAreas")),
    readinessStatus: v.union(v.literal("in_progress"), v.literal("ready_to_use")),
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

    // Create project as "pending"
    const projectId: Id<"projects"> = await ctx.runMutation(
      internal.projects.createProject,
      {
        name: args.name,
        summary: args.summary,
        link: args.link,
        focusAreaIds: args.focusAreaIds,
        readinessStatus: args.readinessStatus,
        status: "pending" as const,
        userId: user._id,
      }
    );

    // Embed the project content
    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: projectId,
    });

    // Update project with entryId
    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId,
      entryId,
    });

    // Search for similar projects (excluding this one)
    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });

    // Get full project details for similar projects
    const similarProjectsRaw = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: projectId,
      }
    );

    // Enrich with team name and upvotes
    const similarProjects = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjectsRaw }
    );

    return { projectId, similarProjects };
  },
});

export const createProject = internalMutation({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.id("users"),
    link: v.optional(v.string()),
    focusAreaIds: v.array(v.id("focusAreas")),
    readinessStatus: v.union(v.literal("in_progress"), v.literal("ready_to_use")),
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
      upvotes: 0,
      viewCount: 0,
      status: args.status,
      userId: args.userId,
      link: args.link,
      focusAreaIds: args.focusAreaIds,
      readinessStatus: args.readinessStatus,
      pinned: args.pinned ?? false,
    });
  },
});

export const updateEntryId = internalMutation({
  args: {
    projectId: v.id("projects"),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { entryId: args.entryId });
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

// Internal query: Fetch multiple projects by their RAG entryIds (used for vector/hybrid search results)
// Returns raw project documents without computed fields
export const getProjectsByEntryIds = internalQuery({
  args: {
    entryIds: v.array(v.string()),
    excludeProjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    // Use index to efficiently query by entryId instead of loading all projects
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
        upvotes: v.number(),
        entryId: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("active")),
        userId: v.id("users"),
        _creationTime: v.number(),
        allFields: v.optional(v.string()),
        link: v.optional(v.string()),
        focusAreaIds: v.array(v.id("focusAreas")),
        readinessStatus: v.optional(v.union(v.literal("in_progress"), v.literal("ready_to_use"))),
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

        // Get creator information
        const creator = await ctx.db.get(project.userId);

        // Get team information
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

export const deleteProject = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
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
    await ctx.db.patch(args.projectId, {
      status: "active" as const,
      hotScore: calculateHotScore(project.engagementScore ?? 0, project._creationTime, now),
    });
  },
});

export const updateProjectFields = internalMutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.optional(v.string()),
    link: v.optional(v.string()),
    focusAreaIds: v.array(v.id("focusAreas")),
    readinessStatus: v.union(v.literal("in_progress"), v.literal("ready_to_use")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      name: args.name,
      summary: args.summary,
      link: args.link,
      focusAreaIds: args.focusAreaIds,
      readinessStatus: args.readinessStatus,
    });
  },
});

export const updateProject = action({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.optional(v.string()),
    link: v.optional(v.string()),
    focusAreaIds: v.array(v.id("focusAreas")),
    readinessStatus: v.union(v.literal("in_progress"), v.literal("ready_to_use")),
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

    // Only allow the project creator to edit
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }

    await ctx.runMutation(internal.projects.updateProjectFields, {
      projectId: args.projectId,
      name: args.name,
      summary: args.summary,
      link: args.link,
      focusAreaIds: args.focusAreaIds,
      readinessStatus: args.readinessStatus,
    });

    // Update the RAG index
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

    await ctx.runMutation(internal.notifications.notifyProjectUpdate, {
      projectId: args.projectId,
      actorUserId: user._id,
    });
  },
});

export const cancelProject = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.status !== "pending") {
      throw new Error("Can only cancel pending projects");
    }

    // Delete from RAG if it has an entryId
    if (project.entryId) {
      await rag.delete(ctx, { entryId: project.entryId as EntryId });
    }

    // Delete from database
    await ctx.runMutation(internal.projects.deleteProject, {
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

// Backfill engagementScore for existing projects (run until returns 0)
export const backfillEngagementScores = internalMutation({
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Preload all focus areas referenced by these projects for quick lookup
    const focusAreaIds = Array.from(
      new Set(projects.flatMap((project) => project.focusAreaIds))
    );
    const focusAreaDocs = await Promise.all(
      focusAreaIds.map((id) => ctx.db.get(id))
    );
    const focusAreaMap = new Map(
      focusAreaDocs
        .filter((fa): fa is NonNullable<typeof fa> => fa !== null)
        .map((fa) => [fa._id, fa])
    );

    // Get current user
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    // Get upvote counts and user upvote status for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const comments = await ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect();

        // Check if current user has upvoted this project
        let hasUpvoted = false;
        if (userId) {
          const userUpvote = upvotes.find((u) => u.userId === userId);
          hasUpvoted = !!userUpvote;
        }

        // Get creator information
        const creator = await ctx.db.get(project.userId);
        
        // Get team information
        let teamName = "";
        if (project.teamId) {
          const team = await ctx.db.get(project.teamId);
          teamName = team?.name ?? "";
        }

        // Get all media items for preview carousel
        const mediaFiles = await ctx.db
          .query("mediaFiles")
          .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
          .order("asc")
          .collect();

        // Generate URLs for all media items
        const previewMedia = await Promise.all(
          mediaFiles.map(async (media) => ({
            _id: media._id,
            storageId: media.storageId,
            type: media.type,
            url: await ctx.storage.getUrl(media.storageId),
          }))
        );

        const focusAreas = project.focusAreaIds
          .map((id) => focusAreaMap.get(id))
          .filter((fa): fa is NonNullable<typeof fa> => fa !== undefined)
          .map((fa) => ({
            _id: fa._id,
            name: fa.name,
            group: fa.group,
          }));
        
        return {
          ...project,
          team: teamName,
          upvotes: upvotes.length,
          commentCount: comments.length,
          hasUpvoted,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          focusAreas,
          previewMedia,
        };
      })
    );

    // Sort by pinned first, then engagement (upvotes + comments), then newest
    return projectsWithCounts.sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned;
      }

      const aScore = a.upvotes + a.commentCount;
      const bScore = b.upvotes + b.commentCount;

      if (bScore !== aScore) {
        return bScore - aScore;
      }

      return b._creationTime - a._creationTime;
    });
  },
});

// Paginated version of list query for infinite scroll
export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    // Fetch pinned projects separately (always show all on first page)
    const isFirstPage = !args.paginationOpts.cursor;
    let pinnedProjects: Doc<"projects">[] = [];
    if (isFirstPage) {
      pinnedProjects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .filter((q) => q.eq(q.field("pinned"), true))
        .collect();
    }

    // Paginate non-pinned projects by hot score (descending)
    const paginatedResult = await ctx.db
      .query("projects")
      .withIndex("by_status_hotScore", (q) => q.eq("status", "active"))
      .filter((q) => q.neq(q.field("pinned"), true))
      .order("desc")
      .paginate(args.paginationOpts);

    // Combine pinned (first page only) + paginated projects
    const projectsToEnrich = [...pinnedProjects, ...paginatedResult.page];

    // Enrich with computed data
    const enrichedProjects = await enrichProjects(ctx, projectsToEnrich, userId);

    return {
      ...paginatedResult,
      page: enrichedProjects,
    };
  },
});

export const getUserProjects = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return [];
    }

    // Get all projects created by this user (both pending and active)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
      .collect();

    // Get upvote counts and creator info for each project
    const projectsWithUpvotes = await Promise.all(
      projects.map(async (project) => {
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        // Get creator information
        const creator = await ctx.db.get(project.userId);

        // Get team information
        let teamName = "";
        if (project.teamId) {
          const team = await ctx.db.get(project.teamId);
          teamName = team?.name ?? "";
        }

        return {
          ...project,
          team: teamName,
          upvotes: upvotes.length,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
        };
      })
    );

    // Sort by creation time descending (newest first)
    return projectsWithUpvotes.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getByUserId = query({
  args: {
    userId: v.id("users"),
    includePending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    if (!viewer) {
      return [];
    }

    const includePending = args.includePending ?? false;
    const canSeePending = includePending && viewer._id === args.userId;

    let projectQuery = ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId));

    if (!canSeePending) {
      projectQuery = projectQuery.filter((q) => q.eq(q.field("status"), "active"));
    }

    const projects = await projectQuery.collect();

    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const [upvotes, team, comments, adoptions] = await Promise.all([
          ctx.db
            .query("upvotes")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect(),
          project.teamId ? ctx.db.get(project.teamId) : Promise.resolve(null),
          ctx.db
            .query("comments")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .collect(),
          ctx.db
            .query("adoptions")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect(),
        ]);

        return {
          ...project,
          team: team?.name ?? "",
          upvotes: upvotes.length,
          commentCount: comments.length,
          adoptionCount: adoptions.length,
        };
      })
    );

    return projectsWithDetails.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getAdoptedByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    if (!viewer) {
      return [];
    }

    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const adoptedProjects = await Promise.all(
      adoptions.map(async (adoption) => {
        const project = await ctx.db.get(adoption.projectId);
        if (!project || project.status !== "active") {
          return null;
        }

        const [upvotes, team, creator] = await Promise.all([
          ctx.db
            .query("upvotes")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect(),
          project.teamId ? ctx.db.get(project.teamId) : Promise.resolve(null),
          ctx.db.get(project.userId),
        ]);

        return {
          _id: project._id,
          name: project.name,
          summary: project.summary,
          readinessStatus: project.readinessStatus,
          team: team?.name ?? "",
          upvotes: upvotes.length,
          creatorId: project.userId,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          adoptedAt: adoption.createdAt,
        };
      })
    );

    return adoptedProjects.filter(
      (project): project is NonNullable<typeof project> => project !== null
    );
  },
});

// Public query: Fetch the newest active projects for sidebar display
// Returns minimal enriched data sorted by creation time descending
export const getNewestProjects = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;

    // Query active projects sorted by creation time (newest first)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);

    // Enrich with minimal data for sidebar display
    const projectsWithBasicInfo = await Promise.all(
      projects.map(async (project) => {
        // Get upvote count
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        // Get creator info
        const creator = await ctx.db.get(project.userId);

        // Get team name
        let teamName = "";
        if (project.teamId) {
          const team = await ctx.db.get(project.teamId);
          teamName = team?.name ?? "";
        }

        return {
          _id: project._id,
          name: project.name,
          team: teamName,
          upvotes: upvotes.length,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          _creationTime: project._creationTime,
        };
      })
    );

    // Return already sorted by _creationTime (from .order("desc"))
    return projectsWithBasicInfo;
  },
});

// Public query: Fetch a single project by its Convex _id (used for project detail pages)
// Returns enriched project with upvote counts, user upvote status, and creator info
export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    // Get upvote count
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get adoption data
    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    // Check if current user has upvoted and adopted
    const currentUser = await getCurrentUser(ctx);
    let hasUpvoted = false;
    let hasAdopted = false;
    if (currentUser) {
      const userUpvote = await ctx.db
        .query("upvotes")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", args.projectId).eq("userId", currentUser._id)
        )
        .first();
      hasUpvoted = !!userUpvote;
      hasAdopted = adoptions.some((a) => a.userId === currentUser._id);
    }

    // Get creator information
    const creator = await ctx.db.get(project.userId);

    // Get team information
    let teamName = "";
    if (project.teamId) {
      const team = await ctx.db.get(project.teamId);
      teamName = team?.name ?? "";
    }

    const focusAreaDocs = await Promise.all(
      project.focusAreaIds.map((id) => ctx.db.get(id))
    );
    const focusAreas = focusAreaDocs
      .filter((fa): fa is NonNullable<typeof fa> => fa !== null)
      .map((fa) => ({
        _id: fa._id,
        name: fa.name,
        group: fa.group,
      }));

    // Get top 6 adopters with user info
    const adoptersWithInfo = await Promise.all(
      adoptions.slice(0, 6).map(async (adoption) => {
        const user = await ctx.db.get(adoption.userId);
        return {
          _id: adoption.userId,
          name: user?.name ?? "Unknown User",
          avatarUrl: user?.avatarUrlId ?? "",
        };
      })
    );

    return {
      ...project,
      team: teamName,
      upvotes: upvotes.length,
      viewCount: project.viewCount ?? 0,
      hasUpvoted,
      creatorName: creator?.name ?? "Unknown User",
      creatorAvatar: creator?.avatarUrlId ?? "",
      focusAreas,
      adoptionCount: adoptions.length,
      adopters: adoptersWithInfo,
      hasAdopted,
    };
  },
});

export const trackView = mutation({
  args: {
    projectId: v.id("projects"),
    viewerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectViews")
      .withIndex("by_project_and_viewer", (q) =>
        q.eq("projectId", args.projectId).eq("viewerId", args.viewerId)
      )
      .first();

    if (existing) {
      return { counted: false };
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await ctx.db.insert("projectViews", {
      projectId: args.projectId,
      viewerId: args.viewerId,
      viewedAt: Date.now(),
    });

    await ctx.db.patch(args.projectId, {
      viewCount: (project.viewCount ?? 0) + 1,
    });

    return { counted: true };
  },
});

// hybrid search for projects (used for search bar)
export const searchProjects = action({
  args: {
    query: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
    }>
  > => {
    // Don't search if query is too short
    if (args.query.trim().length < 2) {
      return [];
    }

    // Run both searches in parallel for faster results
    const [{ entries }, fullTextSearchProjects] = await Promise.all([
      rag.search(ctx, {
        namespace: "projects",
        query: args.query,
        limit: 15,
        vectorScoreThreshold: 0.3,
      }),
      ctx.runQuery(internal.projects.fullTextSearchProjects, {
        query: args.query,
        limit: 15,
      }),
    ]);

    // Extract entryIds from both search results
    const entryIds = entries.map((e) => e.entryId);
    const fullTextEntryIds = fullTextSearchProjects
      .map((p) => p.entryId)
      .filter((id): id is string => id !== undefined);

    // hybrid rank the results
    const hybridRankedEntryIds = hybridRank(
      [entryIds, fullTextEntryIds],
      {
        k: 15,
        weights: [2, 1],
        cutoffScore: 0.05,
      }
    );

    // Fetch all projects in one query (getProjectsByEntryIds queries all active projects anyway)
    const allProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: hybridRankedEntryIds,
        excludeProjectId: undefined,
      }
    );

    // Build a map for quick lookup and maintain hybrid rank order
    const projectMap = new Map(allProjects.map((p) => [p.entryId!, p]));
    const projects = hybridRankedEntryIds
      .map((entryId) => projectMap.get(entryId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    // Return simplified data for search results
    return projects.map((p) => ({
      _id: p._id,
      name: p.name,
      summary: p.summary,
    }));
  },
});

// semantic search for similar projects (used for similar projects section). Can't use hybrid search because the full text search component expressions are limited to 16 terms (words), and our rag expressions use all fields of a project.
export const getSimilarProjects = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
      team: string;
      upvotes: number;
      creatorId: Id<"users">;
      creatorName: string;
      creatorAvatar: string;
    }>
  > => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });

    if (!project) {
      return [];
    }

    const text = project.summary ? `${project.name}\n\n${project.summary}` : project.name;
    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });

    const similarProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: args.projectId,
      }
    );

    // Add computed upvote counts
    const projectsWithCounts = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjects }
    );

    return projectsWithCounts;
  },
});

// Search for similar projects based on text input (used for real-time similar projects preview)
export const searchSimilarProjectsByText = action({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
      team: string;
      upvotes: number;
      creatorId: Id<"users">;
      creatorName: string;
      creatorAvatar: string;
    }>
  > => {
    // Don't search if inputs are too short
    const summaryLength = args.summary?.trim().length ?? 0;
    if (args.name.trim().length < 2 && summaryLength < 2) {
      return [];
    }

    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;

    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });

    const similarProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: undefined,
      }
    );

    // Add computed upvote counts and creator info
    const projectsWithCounts = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjects }
    );

    return projectsWithCounts;
  },
});

// full text search for projects
export const fullTextSearchProjects = internalQuery({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withSearchIndex("allFields", (q) => q.search("allFields", args.query))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(args.limit);
  },
});

export const toggleUpvote = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if user has already upvoted
    const existingUpvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (existingUpvote) {
      // User has upvoted - remove it
      await ctx.db.delete(existingUpvote._id);
      // Decrement engagement score and update hot score
      const now = Date.now();
      const newEngagementScore = Math.max(0, (project.engagementScore ?? 0) - 1);
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, project._creationTime, now),
      });

      if (project.userId !== user._id) {
        await syncUpvoteNotification(ctx, {
          recipientUserId: project.userId,
          projectId: args.projectId,
        });
      }
    } else {
      // User hasn't upvoted - add it
      const now = Date.now();
      await ctx.db.insert("upvotes", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: now,
      });
      // Increment engagement score and update hot score
      const newEngagementScore = (project.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, project._creationTime, now),
      });

      if (project.userId !== user._id) {
        await upsertUpvoteNotification(ctx, {
          recipientUserId: project.userId,
          projectId: args.projectId,
        });
      }
    }
  },
});

export const toggleAdoption = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if user has already adopted
    const existingAdoption = await ctx.db
      .query("adoptions")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (existingAdoption) {
      // User has adopted - remove it
      await ctx.db.delete(existingAdoption._id);
      return { adopted: false };
    } else {
      // User hasn't adopted - add it
      await ctx.db.insert("adoptions", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: Date.now(),
      });

      if (project.userId !== user._id) {
        await createProjectNotification(ctx, {
          recipientUserId: project.userId,
          actorUserId: user._id,
          projectId: project._id,
          type: "adoption",
        });
      }

      return { adopted: true };
    }
  },
});

export const hasUserUpvoted = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return false;
    }

    const upvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();

    return !!upvote;
  },
});

export const getUpvoteCount = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return upvotes.length;
  },
});

export const getAdopters = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const adoptersWithInfo = await Promise.all(
      adoptions.map(async (adoption) => {
        const user = await ctx.db.get(adoption.userId);
        return {
          _id: adoption.userId,
          name: user?.name ?? "Unknown User",
          avatarUrl: user?.avatarUrlId ?? "",
        };
      })
    );

    return adoptersWithInfo;
  },
});

// Refresh hot scores for all active projects (called by cron job)
export const refreshHotScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const project of projects) {
      const hotScore = calculateHotScore(
        project.engagementScore ?? 0,
        project._creationTime,
        now
      );
      await ctx.db.patch(project._id, { hotScore });
    }

    return { updated: projects.length };
  },
});

// Public query: Fetch projects by entryIds for chat display (minimal data)
export const getProjectsByEntryIdsPublic = query({
  args: {
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Batch fetch all projects first
    const projectQueries = args.entryIds.map((entryId) =>
      ctx.db
        .query("projects")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first()
    );
    const projectResults = await Promise.all(projectQueries);
    const projects = projectResults.filter(
      (p): p is NonNullable<typeof p> => p !== null
    );

    // Batch fetch first media file for each project
    const mediaQueries = projects.map((project) =>
      ctx.db
        .query("mediaFiles")
        .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
        .order("asc")
        .first()
    );
    const mediaResults = await Promise.all(mediaQueries);

    // Build a map of project ID to first media file
    // The index alignment between projects and mediaResults is guaranteed by map + Promise.all
    const mediaMap = new Map<Id<"projects">, Doc<"mediaFiles"> | null>();
    projects.forEach((project, index) => {
      const media = mediaResults[index] ?? null;
      mediaMap.set(project._id, media);
    });

    // Enrich projects with preview media
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const firstMedia = mediaMap.get(project._id);
        
        // Only process storage URL if media exists
        const previewMedia = firstMedia
          ? [
              {
                _id: firstMedia._id,
                storageId: firstMedia.storageId,
                type: firstMedia.type,
                url: await ctx.storage.getUrl(firstMedia.storageId),
              },
            ]
          : [];

        return {
          _id: project._id,
          name: project.name,
          summary: project.summary,
          previewMedia,
        };
      })
    );

    return enrichedProjects;
  },
});
