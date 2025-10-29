import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import type { Id } from "./_generated/dataModel";

export const create = action({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"projects">> => {
    // Create project first
    const projectId: Id<"projects"> = await ctx.runMutation(internal.projects.createProject, args);
    
    // Embed the project content
    const text = `${args.name}\n\n${args.summary}`;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: projectId,
    });
    
    // Update project with entryId
    await ctx.runMutation(internal.projects.updateEntryId, { projectId, entryId });
    
    return projectId;
  },
});

export const createProject = internalMutation({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
  },
  handler: async (ctx, args) => {
    const leadInitials = args.lead
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return await ctx.db.insert("projects", {
      name: args.name,
      summary: args.summary,
      team: args.team,
      lead: args.lead,
      leadInitials,
      upvotes: 0,
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

    const text = `${project.name}\n\n${project.summary}`;
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

