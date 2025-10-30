import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import type { Id } from "./_generated/dataModel";
import type { EntryId } from "@convex-dev/rag";

export const create = action({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
  },
  handler: async (ctx, args): Promise<{
    projectId: Id<"projects">;
    similarProjects: Array<{
      _id: Id<"projects">;
      name: string;
      summary: string;
      team: string;
      lead: string;
      leadInitials: string;
      upvotes: number;
    }>;
  }> => {
    // Create project as "pending"
    const projectId: Id<"projects"> = await ctx.runMutation(
      internal.projects.createProject,
      { ...args, status: "pending" as const }
    );

    // Embed the project content
    const text = `${args.name}\n\n${args.summary}`;
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
    const similarProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: projectId,
      }
    );

    return { projectId, similarProjects };
  },
});

export const createProject = internalMutation({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
    status: v.union(v.literal("pending"), v.literal("active")),
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
      status: args.status,
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

export const getProjectsByEntryIds = internalQuery({
  args: {
    entryIds: v.array(v.string()),
    excludeProjectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return projects.filter(
      (p) =>
        args.entryIds.includes(p.entryId ?? "") &&
        p._id !== args.excludeProjectId
    );
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

    await ctx.db.patch(args.projectId, {
      status: "active" as const,
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
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    // Sort by upvotes descending
    return projects.sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

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
      summary: string;
      team: string;
      lead: string;
      leadInitials: string;
      upvotes: number;
    }>
  > => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });

    if (!project) {
      return [];
    }

    const text = `${project.name}\n\n${project.summary}`;
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

    return similarProjects;
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

