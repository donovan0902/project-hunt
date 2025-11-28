import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
      upvotes: 0,
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

    const sorted = comments.sort((a, b) => a.createdAt - b.createdAt);

    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    if (!userId) {
      // Enrich comments with user data even for unauthenticated users
      const enrichedComments = await Promise.all(
        sorted.map(async (comment) => {
          const user = await ctx.db.get(comment.userId as Id<"users">);
          return {
            ...comment,
            upvotes: comment.upvotes ?? 0,
            hasUpvoted: false,
            userName: user?.name ?? "Unknown User",
            userAvatar: user?.image ?? "",
          };
        })
      );
      return enrichedComments;
    }

    const userUpvotes = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const upvotedCommentIds = new Set(userUpvotes.map((upvote) => upvote.commentId));

    // Enrich comments with user data
    const enrichedComments = await Promise.all(
      sorted.map(async (comment) => {
        const user = await ctx.db.get(comment.userId as Id<"users">);
        return {
          ...comment,
          upvotes: comment.upvotes ?? 0,
          hasUpvoted: upvotedCommentIds.has(comment._id),
          userName: user?.name ?? "Unknown User",
          userAvatar: user?.image ?? "",
        };
      })
    );

    return enrichedComments;
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
      upvotes: 0,
    });

    const existingUpvotes = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    await Promise.all(existingUpvotes.map((upvote) => ctx.db.delete(upvote._id)));
  },
});

export const toggleCommentUpvote = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found");
    }

    const userId = identity.subject;
    const existing = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", userId)
      )
      .unique();

    const currentUpvotes = comment.upvotes ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const updatedCount = Math.max(currentUpvotes - 1, 0);
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: false };
    } else {
      await ctx.db.insert("commentUpvotes", {
        commentId: args.commentId,
        userId,
        createdAt: Date.now(),
      });
      const updatedCount = currentUpvotes + 1;
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: true };
    }
  },
});
