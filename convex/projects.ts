import { mutation, query, action, internalQuery } from "./_generated/server";
// custom internal mutation for trigger that updates allFields field for projects for full text search
// this internal mutation will be a wrapper for the createProject and updateProjectFields internal mutations
import { internalMutation } from "./functions";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import type { Id } from "./_generated/dataModel";
import type { EntryId } from "@convex-dev/rag";
import { userByExternalId } from "./users";
import { hybridRank } from "@convex-dev/rag";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only allow the project creator to add media
    if (project.userId !== identity.subject) {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only allow the project creator to delete media
    if (project.userId !== identity.subject) {
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
    return await ctx.db
      .query("mediaFiles")
      .withIndex("by_project_ordered", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
  },
});

export const create = action({
  args: {
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    headline: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    projectId: Id<"projects">;
    similarProjects: Array<{
      _id: Id<"projects">;
      name: string;
      summary: string;
      team: string;
      upvotes: number;
    }>;
  }> => {

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    // Create project as "pending"
    const projectId: Id<"projects"> = await ctx.runMutation(
      internal.projects.createProject,
      { ...args, status: "pending" as const, userId: identity.subject }
    );

    // Embed the project content
    const text = args.headline 
      ? `${args.name}\n${args.headline}\n\n${args.summary}`
      : `${args.name}\n\n${args.summary}`;
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
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.string(),
    headline: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      name: args.name,
      summary: args.summary,
      team: args.team,
      upvotes: 0,
      status: args.status,
      userId: args.userId,
      headline: args.headline,
      link: args.link,
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

export const addUpvoteCounts = internalQuery({
  args: {
    projects: v.array(
      v.object({
        _id: v.id("projects"),
        name: v.string(),
        summary: v.string(),
        team: v.string(),
        upvotes: v.number(),
        entryId: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("active")),
        userId: v.string(),
        _creationTime: v.number(),
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
        const creator = await userByExternalId(ctx, project.userId);

        return {
          _id: project._id,
          name: project.name,
          summary: project.summary,
          team: project.team,
          upvotes: upvotes.length,
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

    await ctx.db.patch(args.projectId, {
      status: "active" as const,
    });
  },
});

export const updateProjectFields = internalMutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    headline: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      name: args.name,
      summary: args.summary,
      team: args.team,
      headline: args.headline,
      link: args.link,
    });
  },
});

export const updateProject = action({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    headline: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    // Only allow the project creator to edit
    if (project.userId !== identity.subject) {
      throw new Error("You can only edit your own projects");
    }

    await ctx.runMutation(internal.projects.updateProjectFields, {
      projectId: args.projectId,
      name: args.name,
      summary: args.summary,
      team: args.team,
      headline: args.headline,
      link: args.link,
    });

    // Update the RAG index
    const text = args.headline
      ? `${args.name}\n${args.headline}\n\n${args.summary}`
      : `${args.name}\n\n${args.summary}`;

    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: args.projectId,
    });

    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId: args.projectId,
      entryId,
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

    const text = project.headline 
      ? `${project.name}\n${project.headline}\n\n${project.summary}`
      : `${project.name}\n\n${project.summary}`;
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
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

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
        const creator = await userByExternalId(ctx, project.userId);
        
        return {
          ...project,
          upvotes: upvotes.length,
          commentCount: comments.length,
          hasUpvoted,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
        };
      })
    );

    // Sort by upvotes descending
    return projectsWithCounts.sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const getUserProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Get all projects created by this user (both pending and active)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get upvote counts and creator info for each project
    const projectsWithUpvotes = await Promise.all(
      projects.map(async (project) => {
        const upvotes = await ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        // Get creator information
        const creator = await userByExternalId(ctx, project.userId);

        return {
          ...project,
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

    // Check if current user has upvoted
    const identity = await ctx.auth.getUserIdentity();
    let hasUpvoted = false;
    if (identity) {
      const userUpvote = await ctx.db
        .query("upvotes")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", args.projectId).eq("userId", identity.subject)
        )
        .first();
      hasUpvoted = !!userUpvote;
    }

    // Get creator information
    const creator = await userByExternalId(ctx, project.userId);

    return {
      ...project,
      upvotes: upvotes.length,
      hasUpvoted,
      creatorName: creator?.name ?? "Unknown User",
      creatorAvatar: creator?.avatarUrlId ?? "",
    };
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
      headline?: string;
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
        limit: 8,
        vectorScoreThreshold: 0.3,
      }),
      ctx.runQuery(internal.projects.fullTextSearchProjects, {
        query: args.query,
        limit: 8,
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
        k: 10,
        weights: [2, 1],
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
      headline: p.headline,
    }));
  },
});

// semantic search for similar projects (used for similar projects section). Can't use hybrid search because the full text search component expressions are limited to 16 terms (words), and we our rag expressions use all fields of a project. 
// We could potentially do a hybrid search with the full text component expression being the project's title and headline, prolly marginally better results. Not a priority for now.
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
      upvotes: number;
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

    const text = project.headline
      ? `${project.name}\n${project.headline}\n\n${project.summary}`
      : `${project.name}\n\n${project.summary}`;
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
      internal.projects.addUpvoteCounts,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    // Check if user has already upvoted
    const existingUpvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .first();

    if (existingUpvote) {
      // User has upvoted - remove it
      await ctx.db.delete(existingUpvote._id);
    } else {
      // User hasn't upvoted - add it
      await ctx.db.insert("upvotes", {
        projectId: args.projectId,
        userId,
        createdAt: Date.now(),
      });
    }
  },
});

export const hasUserUpvoted = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;

    const upvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId)
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
