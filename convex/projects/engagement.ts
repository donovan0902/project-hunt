import { mutation, query } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUser } from "../users";
import { emitNotificationEvent } from "../notificationEngine";
import { calculateHotScore } from "./helpers";
import { propagateHotScoreToMemberships } from "./spaces";
import { incrementalAddEngagedProject, incrementalRemoveEngagedProject } from "../userAffinities";

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

export const toggleUpvote = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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
      await ctx.db.delete(existingUpvote._id);
      const now = Date.now();
      const newEngagementScore = Math.max(0, (project.engagementScore ?? 0) - 1);
      const newUpvoteCount = Math.max(0, (project.upvoteCount ?? 0) - 1);
      const newHotScore = calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined);
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        upvoteCount: newUpvoteCount,
        hotScore: newHotScore,
      });
      await propagateHotScoreToMemberships(ctx, args.projectId, newHotScore);
      if (project.userId !== user._id) {
        await emitNotificationEvent(ctx, {
          type: "upvote",
          projectId: args.projectId,
          actorUserId: user._id,
          isRemoval: true,
        });
      }
      // Incremental affinity update
      await incrementalRemoveEngagedProject(ctx, user._id, args.projectId);
    } else {
      const now = Date.now();
      await ctx.db.insert("upvotes", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: now,
      });
      const newEngagementScore = (project.engagementScore ?? 0) + 1;
      const newUpvoteCount = (project.upvoteCount ?? 0) + 1;
      const newHotScore = calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined);
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        upvoteCount: newUpvoteCount,
        hotScore: newHotScore,
      });
      await propagateHotScoreToMemberships(ctx, args.projectId, newHotScore);
      if (project.userId !== user._id) {
        await emitNotificationEvent(ctx, {
          type: "upvote",
          projectId: args.projectId,
          actorUserId: user._id,
          isRemoval: false,
        });
      }
      // Incremental affinity update
      await incrementalAddEngagedProject(ctx, user._id, args.projectId, project.userId);
    }
  },
});

export const toggleFollow = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existingFollow = await ctx.db
      .query("adoptions")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);
      await ctx.db.patch(args.projectId, {
        adoptionCount: Math.max(0, (project.adoptionCount ?? 0) - 1),
      });
      await incrementalRemoveEngagedProject(ctx, user._id, args.projectId);
      return { followed: false };
    } else {
      await ctx.db.insert("adoptions", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.projectId, {
        adoptionCount: (project.adoptionCount ?? 0) + 1,
      });
      if (project.userId !== user._id) {
        await emitNotificationEvent(ctx, {
          type: "follow",
          projectId: project._id,
          actorUserId: user._id,
        });
      }
      await incrementalAddEngagedProject(ctx, user._id, args.projectId, project.userId);
      return { followed: true };
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

export const getFollowers = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    const followersWithInfo = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.userId);
        return {
          _id: follow.userId,
          name: user?.name ?? "Unknown User",
          avatarUrl: user?.avatarUrlId ?? "",
        };
      })
    );
    return followersWithInfo;
  },
});

export const trackLinkClick = mutation({
  args: {
    projectId: v.id("projects"),
    resourceId: v.string(),
    resourceType: v.union(v.literal("link"), v.literal("file")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("linkClickCounts")
      .withIndex("by_project_resource", (q) =>
        q.eq("projectId", args.projectId).eq("resourceId", args.resourceId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        lastClickedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("linkClickCounts", {
        projectId: args.projectId,
        resourceId: args.resourceId,
        resourceType: args.resourceType,
        count: 1,
        lastClickedAt: Date.now(),
      });
    }
  },
});

export const getLinkClickCounts = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("linkClickCounts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.resourceId] = row.count;
    }
    return result;
  },
});

export const refreshHotScores = internalMutationFromFunctions({
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
        now,
        project.lastVersionAt ?? undefined
      );
      await ctx.db.patch(project._id, { hotScore });
      await propagateHotScoreToMemberships(ctx, project._id, hotScore);
    }
    return { updated: projects.length };
  },
});
