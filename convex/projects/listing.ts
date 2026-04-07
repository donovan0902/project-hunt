import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { getCurrentUser } from "../users";
import { enrichProjects } from "./helpers";
import { getAllSpacesForProject } from "./spaces";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const [upvotes, comments, creator, mediaFiles, spaces] = await Promise.all([
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
          ctx.db
            .query("mediaFiles")
            .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
            .order("asc")
            .collect(),
          getAllSpacesForProject(ctx, project._id),
        ]);
        let teamName = "";
        if (project.teamId) {
          const team = await ctx.db.get(project.teamId);
          teamName = team?.name ?? "";
        }
        const previewMedia = await Promise.all(
          mediaFiles.map(async (media) => ({
            _id: media._id,
            storageId: media.storageId,
            type: media.type,
            url: await ctx.storage.getUrl(media.storageId),
          }))
        );
        return {
          ...project,
          team: teamName,
          upvotes: upvotes.length,
          commentCount: comments.length,
          hasUpvoted: userId ? upvotes.some((u) => u.userId === userId) : false,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          focusArea: spaces.primary,
          previewMedia,
        };
      })
    );

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

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;
    const isFirstPage = !args.paginationOpts.cursor;
    let pinnedProjects: Doc<"projects">[] = [];
    if (isFirstPage) {
      pinnedProjects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .filter((q) => q.eq(q.field("pinned"), true))
        .collect();
    }
    const paginatedResult = await ctx.db
      .query("projects")
      .withIndex("by_status_hotScore", (q) => q.eq("status", "active"))
      .filter((q) => q.neq(q.field("pinned"), true))
      .order("desc")
      .paginate(args.paginationOpts);
    const projectsToEnrich = [...pinnedProjects, ...paginatedResult.page];
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
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
      .collect();
    const projectsWithUpvotes = await Promise.all(
      projects.map(async (project) => {
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
          ...project,
          team: teamName,
          upvotes: upvotes.length,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
        };
      })
    );
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
        const [upvotes, team, comments, follows] = await Promise.all([
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
          followerCount: follows.length,
        };
      })
    );
    return projectsWithDetails.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getFollowedByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    if (!viewer) {
      return [];
    }
    const follows = await ctx.db
      .query("adoptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    const followedProjects = await Promise.all(
      follows.map(async (follow) => {
        const project = await ctx.db.get(follow.projectId);
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
          followedAt: follow.createdAt,
        };
      })
    );
    return followedProjects.filter(
      (project): project is NonNullable<typeof project> => project !== null
    );
  },
});

export const listNewestPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    const paginatedResult = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedProjects = await enrichProjects(ctx, paginatedResult.page, userId);
    return {
      ...paginatedResult,
      page: enrichedProjects,
    };
  },
});

export const getNewestProjects = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);
    const projectsWithBasicInfo = await Promise.all(
      projects.map(async (project) => {
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
          team: teamName,
          upvotes: upvotes.length,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          _creationTime: project._creationTime,
        };
      })
    );
    return projectsWithBasicInfo;
  },
});

export const getTopProjectsBySpace = query({
  args: {
    focusAreaId: v.id("focusAreas"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    // Query membership rows sorted by hotScore
    const topRows = await ctx.db
      .query("projectSpaces")
      .withIndex("by_focusArea_hotScore", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .order("desc")
      .take(limit);

    const projects = (
      await Promise.all(
        topRows.map(async (row) => {
          const project = await ctx.db.get(row.projectId);
          if (!project || project.status !== "active") return null;
          return project;
        })
      )
    ).filter((p): p is NonNullable<typeof p> => p !== null);

    return Promise.all(
      projects.map(async (project) => {
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        return {
          _id: project._id,
          name: project.name,
          upvoteCount: upvotes.length,
          commentCount: comments.filter((c) => !c.isDeleted).length,
        };
      })
    );
  },
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const follows = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    const currentUser = await getCurrentUser(ctx);
    let hasUpvoted = false;
    let hasFollowed = false;
    if (currentUser) {
      const userUpvote = await ctx.db
        .query("upvotes")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", args.projectId).eq("userId", currentUser._id)
        )
        .first();
      hasUpvoted = !!userUpvote;
      hasFollowed = follows.some((a) => a.userId === currentUser._id);
    }
    const creator = await ctx.db.get(project.userId);
    let teamName = "";
    if (project.teamId) {
      const team = await ctx.db.get(project.teamId);
      teamName = team?.name ?? "";
    }
    const [followersWithInfo, spaces] = await Promise.all([
      Promise.all(
        follows.slice(0, 6).map(async (follow) => {
          const user = await ctx.db.get(follow.userId);
          return {
            _id: follow.userId,
            name: user?.name ?? "Unknown User",
            avatarUrl: user?.avatarUrlId ?? "",
          };
        })
      ),
      getAllSpacesForProject(ctx, args.projectId),
    ]);
    return {
      ...project,
      team: teamName,
      upvotes: upvotes.length,
      viewCount: project.viewCount ?? 0,
      hasUpvoted,
      creatorName: creator?.name ?? "Unknown User",
      creatorAvatar: creator?.avatarUrlId ?? "",
      focusArea: spaces.primary,
      additionalFocusAreas: spaces.secondary,
      followerCount: follows.length,
      followers: followersWithInfo,
      hasFollowed,
    };
  },
});

export const getProjectsByEntryIdsPublic = query({
  args: {
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const projects = await Promise.all(
      args.entryIds.map(async (entryId) => {
        const project = await ctx.db
          .query("projects")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();
        if (!project) {
          return null;
        }
        const firstMedia =
          (await ctx.db
            .query("mediaFiles")
            .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
            .order("asc")
            .first()) ?? null;
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
    return projects
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        summary: p.summary,
        previewMedia: p.previewMedia,
      }));
  },
});
