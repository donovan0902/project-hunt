import { action, internalQuery, query } from "./_generated/server";
import { internalMutation } from "./functions";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";
import type { Id } from "./_generated/dataModel";

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
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  },
});


export const createTeam = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ teamId: Id<"teams"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Create the team
    const teamId = await ctx.runMutation(
      internal.teams.createTeamInternal,
      { name: args.name, description: args.description }
    );

    // Associate user with team
    await ctx.runMutation(internal.teams.associateUserWithTeam, {
      teamId,
    });

    return { teamId };
  },
});

export const createTeamInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", {
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

export const associateUserWithTeam = internalMutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, { teamId: args.teamId });
  },
});

export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});
