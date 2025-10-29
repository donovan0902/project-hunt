import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate initials from lead name
    const leadInitials = args.lead
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      summary: args.summary,
      team: args.team,
      lead: args.lead,
      leadInitials,
      upvotes: 0,
    });

    return projectId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    // Sort by upvotes descending
    return projects.sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const upvote = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(args.projectId, {
      upvotes: project.upvotes + 1,
    });
  },
});

