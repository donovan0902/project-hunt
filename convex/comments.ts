import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addComment = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("comments", {
      projectId: args.projectId,
      userId: identity.subject,
      content: args.content,
      parentCommentId: args.parentCommentId,
      createdAt: Date.now(),
    });
  },
});

export const getComments = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Sort by createdAt ascending (oldest first)
    return comments.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only allow the comment owner to delete
    if (comment.userId !== identity.subject) {
      throw new Error("You can only delete your own comments");
    }

    // Soft delete to maintain thread integrity
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
    });
  },
});
