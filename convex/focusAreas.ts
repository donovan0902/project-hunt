import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

export const getById = query({
  args: { id: v.id("focusAreas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("focusAreas")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

export const listActiveForSidebar = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const focusAreas = await ctx.db
      .query("focusAreas")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    let starredIds = new Set<string>();

    if (user) {
      const starredFocusAreas = await ctx.db
        .query("starredFocusAreas")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      starredIds = new Set(starredFocusAreas.map((star) => star.focusAreaId));
    }

    return focusAreas
      .map((focusArea) => ({
        ...focusArea,
        isStarred: starredIds.has(focusArea._id),
      }))
      .sort((a, b) => {
        if (a.isStarred !== b.isStarred) {
          return a.isStarred ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  },
});

export const listActiveGrouped = query({
  handler: async (ctx) => {
    const focusAreas = await ctx.db
      .query("focusAreas")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const grouped: Record<string, typeof focusAreas> = {};
    for (const fa of focusAreas) {
      const groupKey = fa.group ?? "Other";
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(fa);
    }
    return grouped;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    group: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const focusAreaId = await ctx.db.insert("focusAreas", {
      name: args.name,
      group: args.group,
      description: args.description,
      icon: args.icon,
      ownerId: user._id,
      isActive: true,
      createdAt: Date.now(),
    });

    // Link the focus area with the user
    await ctx.db.insert("userFocusAreas", {
      userId: user._id,
      focusAreaId,
      createdAt: Date.now(),
    });

    return focusAreaId;
  },
});

export const update = internalMutation({
  args: {
    id: v.id("focusAreas"),
    name: v.optional(v.string()),
    group: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const archive = internalMutation({
  args: {
    id: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const reactivate = internalMutation({
  args: {
    id: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: true });
  },
});

export const isFollowingSpace = query({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const existing = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user_and_focus", (q) =>
        q.eq("userId", user._id).eq("focusAreaId", args.focusAreaId)
      )
      .unique();
    return !!existing;
  },
});

export const getMemberCount = query({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_focus_area", (q) => q.eq("focusAreaId", args.focusAreaId))
      .collect();
    return members.length;
  },
});

export const toggleFollowSpace = mutation({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user_and_focus", (q) =>
        q.eq("userId", user._id).eq("focusAreaId", args.focusAreaId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    } else {
      await ctx.db.insert("userFocusAreas", {
        userId: user._id,
        focusAreaId: args.focusAreaId,
        createdAt: Date.now(),
      });
      return { following: true };
    }
  },
});

export const toggleSidebarStar = mutation({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("starredFocusAreas")
      .withIndex("by_user_and_focus", (q) =>
        q.eq("userId", user._id).eq("focusAreaId", args.focusAreaId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isStarred: false };
    }

    await ctx.db.insert("starredFocusAreas", {
      userId: user._id,
      focusAreaId: args.focusAreaId,
      createdAt: Date.now(),
    });

    return { isStarred: true };
  },
});
