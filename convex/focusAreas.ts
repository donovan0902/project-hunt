import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("focusAreas")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
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
      if (!grouped[fa.group]) grouped[fa.group] = [];
      grouped[fa.group].push(fa);
    }
    return grouped;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    group: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("focusAreas", {
      name: args.name,
      group: args.group,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("focusAreas"),
    name: v.optional(v.string()),
    group: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const archive = mutation({
  args: {
    id: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const reactivate = mutation({
  args: {
    id: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: true });
  },
});
