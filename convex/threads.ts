import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import { calculateHotScore } from "./projects/helpers";
import { parseMentionsFromHtml } from "./mentions";
import { emitNotificationEvent } from "./notificationEngine";
import { rag } from "./rag";
import type { EntryId } from "@convex-dev/rag";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAllFields(title: string, body?: string): string {
  return body ? `${title} ${body}` : title;
}

// ─── Creation ────────────────────────────────────────────────────────────────

export const createThread = mutation({
  args: {
    title: v.string(),
    body: v.optional(v.string()),
    focusAreaId: v.id("focusAreas"),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();
    const trimmedTitle = args.title.trim();
    const trimmedBody = args.body?.trim() || undefined;

    const threadId = await ctx.db.insert("threads", {
      title: trimmedTitle,
      body: trimmedBody,
      userId: user._id,
      focusAreaId: args.focusAreaId,
      upvoteCount: 0,
      commentCount: 0,
      engagementScore: 0,
      hotScore: calculateHotScore(0, now, now),
      createdAt: now,
      allFields: buildAllFields(trimmedTitle, trimmedBody),
      imageStorageIds: args.imageStorageIds,
    });

    // Notify followers of the space about the new thread
    await emitNotificationEvent(ctx, {
      type: "thread_created",
      threadId,
      focusAreaId: args.focusAreaId,
      actorUserId: user._id,
      contentTitle: trimmedTitle,
    });

    // Index thread in RAG for AI search
    await ctx.scheduler.runAfter(
      0,
      internal.threads.indexThreadInRag,
      {
        threadId,
        title: trimmedTitle,
        body: trimmedBody,
      }
    );

    // Process @mentions in thread body
    if (trimmedBody) {
      const mentionedUserIds = parseMentionsFromHtml(trimmedBody);
      if (mentionedUserIds.length > 0) {
        await emitNotificationEvent(ctx, {
          type: "mention",
          actorUserId: user._id,
          mentionedUserIds,
          contentType: "thread",
          contentId: threadId as string,
          contentTitle: trimmedTitle,
          contextSnippet: trimmedBody.slice(0, 200),
          threadId,
          excludeUserIds: [],
        });
      }
    }

    return threadId;
  },
});

// ─── Editing ────────────────────────────────────────────────────────────────

export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
    body: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.userId !== user._id)
      throw new Error("You can only edit your own threads");

    const trimmedTitle = args.title.trim();
    const trimmedBody = args.body?.trim() || undefined;

    await ctx.db.patch(args.threadId, {
      title: trimmedTitle,
      body: trimmedBody,
      allFields: buildAllFields(trimmedTitle, trimmedBody),
      imageStorageIds: args.imageStorageIds,
    });

    // Clean up removed images from storage (after successful patch)
    const oldIds = new Set(thread.imageStorageIds ?? []);
    const newIds = new Set(args.imageStorageIds ?? []);
    for (const oldId of oldIds) {
      if (!newIds.has(oldId)) {
        await ctx.storage.delete(oldId);
      }
    }

    // Re-index thread in RAG
    await ctx.scheduler.runAfter(
      0,
      internal.threads.indexThreadInRag,
      {
        threadId: args.threadId,
        title: trimmedTitle,
        body: trimmedBody,
      }
    );

    // Process @mentions: only notify newly-added mentions
    if (trimmedBody) {
      const oldMentions = new Set(parseMentionsFromHtml(thread.body ?? ""));
      const newMentions = parseMentionsFromHtml(trimmedBody);
      const addedMentions = newMentions.filter((id) => !oldMentions.has(id));

      if (addedMentions.length > 0) {
        await emitNotificationEvent(ctx, {
          type: "mention",
          actorUserId: user._id,
          mentionedUserIds: addedMentions,
          contentType: "thread",
          contentId: args.threadId as string,
          contentTitle: trimmedTitle,
          threadId: args.threadId,
          excludeUserIds: [],
        });
      }
    }
  },
});

// ─── Deletion ───────────────────────────────────────────────────────────────

export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.userId !== user._id)
      throw new Error("You can only delete your own threads");

    // Cascade: delete all comment upvotes, then comments
    const comments = await ctx.db
      .query("threadComments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const comment of comments) {
      const commentUpvotes = await ctx.db
        .query("threadCommentUpvotes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      await Promise.all(
        commentUpvotes.map((upvote) => ctx.db.delete(upvote._id))
      );
    }

    await Promise.all(comments.map((c) => ctx.db.delete(c._id)));

    // Delete thread upvotes
    const threadUpvotes = await ctx.db
      .query("threadUpvotes")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
    await Promise.all(
      threadUpvotes.map((upvote) => ctx.db.delete(upvote._id))
    );

    // Clean up inline images from storage
    if (thread.imageStorageIds) {
      await Promise.all(
        thread.imageStorageIds.map((id) => ctx.storage.delete(id))
      );
    }

    // Remove from RAG index
    if (thread.entryId) {
      await ctx.scheduler.runAfter(
        0,
        internal.threads.deleteThreadFromRag,
        { entryId: thread.entryId }
      );
    }

    // Delete the thread itself
    await ctx.db.delete(args.threadId);
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getById = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const currentUser = await getCurrentUser(ctx);

    const [creator, focusArea] = await Promise.all([
      ctx.db.get(thread.userId),
      ctx.db.get(thread.focusAreaId),
    ]);

    let hasUpvoted = false;
    if (currentUser) {
      const existingUpvote = await ctx.db
        .query("threadUpvotes")
        .withIndex("by_thread_and_user", (q) =>
          q.eq("threadId", args.threadId).eq("userId", currentUser._id)
        )
        .unique();
      hasUpvoted = !!existingUpvote;
    }

    return {
      ...thread,
      creatorName: creator?.name ?? "Unknown User",
      creatorAvatar: creator?.avatarUrlId ?? "",
      hasUpvoted,
      focusArea: focusArea
        ? {
            _id: focusArea._id,
            name: focusArea.name,
            group: focusArea.group,
            icon: focusArea.icon,
          }
        : null,
    };
  },
});

export const listPaginatedBySpace = query({
  args: {
    focusAreaId: v.id("focusAreas"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    const paginatedResult = await ctx.db
      .query("threads")
      .withIndex("by_focusArea_hotScore", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedThreads = await Promise.all(
      paginatedResult.page.map(async (thread) => {
        const [creator, focusArea] = await Promise.all([
          ctx.db.get(thread.userId),
          ctx.db.get(thread.focusAreaId),
        ]);

        let hasUpvoted = false;
        if (userId) {
          const existingUpvote = await ctx.db
            .query("threadUpvotes")
            .withIndex("by_thread_and_user", (q) =>
              q.eq("threadId", thread._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existingUpvote;
        }

        return {
          ...thread,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          hasUpvoted,
          focusArea: focusArea
            ? {
                _id: focusArea._id,
                name: focusArea.name,
                group: focusArea.group,
                icon: focusArea.icon,
              }
            : null,
        };
      })
    );

    return {
      ...paginatedResult,
      page: enrichedThreads,
    };
  },
});

export const getTopThreadsBySpace = query({
  args: {
    focusAreaId: v.id("focusAreas"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_focusArea_hotScore", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .order("desc")
      .take(limit);

    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    return Promise.all(
      threads.map(async (thread) => {
        const creator = await ctx.db.get(thread.userId);
        let hasUpvoted = false;
        if (userId) {
          const existingUpvote = await ctx.db
            .query("threadUpvotes")
            .withIndex("by_thread_and_user", (q) =>
              q.eq("threadId", thread._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existingUpvote;
        }
        return {
          _id: thread._id,
          title: thread.title,
          upvoteCount: thread.upvoteCount,
          commentCount: thread.commentCount,
          hasUpvoted,
          creatorName: creator?.name ?? "Unknown User",
          createdAt: thread.createdAt,
        };
      })
    );
  },
});

export const getTrendingThreads = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_hotScore")
      .order("desc")
      .take(limit);

    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    return Promise.all(
      threads.map(async (thread) => {
        const [creator, focusArea] = await Promise.all([
          ctx.db.get(thread.userId),
          ctx.db.get(thread.focusAreaId),
        ]);
        let hasUpvoted = false;
        if (userId) {
          const existingUpvote = await ctx.db
            .query("threadUpvotes")
            .withIndex("by_thread_and_user", (q) =>
              q.eq("threadId", thread._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existingUpvote;
        }
        return {
          _id: thread._id,
          title: thread.title,
          upvoteCount: thread.upvoteCount,
          commentCount: thread.commentCount,
          hasUpvoted,
          creatorName: creator?.name ?? "Unknown User",
          createdAt: thread.createdAt,
          spaceName: focusArea?.name ?? null,
          spaceIcon: focusArea?.icon ?? null,
          spaceId: focusArea?._id ?? null,
        };
      })
    );
  },
});

export const getThreadImageUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.storageIds.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      }))
    );
    return results.filter(
      (r): r is { storageId: typeof r.storageId; url: string } =>
        r.url !== null
    );
  },
});

// ─── Upvotes ─────────────────────────────────────────────────────────────────

export const toggleUpvote = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const existing = await ctx.db
      .query("threadUpvotes")
      .withIndex("by_thread_and_user", (q) =>
        q.eq("threadId", args.threadId).eq("userId", user._id)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.delete(existing._id);
      const newUpvoteCount = Math.max(0, thread.upvoteCount - 1);
      const newEngagementScore = Math.max(
        0,
        (thread.engagementScore ?? 0) - 1
      );
      await ctx.db.patch(args.threadId, {
        upvoteCount: newUpvoteCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
      return { upvoted: false };
    } else {
      await ctx.db.insert("threadUpvotes", {
        threadId: args.threadId,
        userId: user._id,
        createdAt: now,
      });
      const newUpvoteCount = thread.upvoteCount + 1;
      const newEngagementScore = (thread.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.threadId, {
        upvoteCount: newUpvoteCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
      return { upvoted: true };
    }
  },
});

// ─── Comments ────────────────────────────────────────────────────────────────

export const addComment = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    parentCommentId: v.optional(v.id("threadComments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const commentId = await ctx.db.insert("threadComments", {
      threadId: args.threadId,
      userId: user._id,
      content: args.content,
      parentCommentId: args.parentCommentId,
      createdAt: Date.now(),
      upvotes: 0,
    });

    // Increment thread engagement score and comment count
    const thread = await ctx.db.get(args.threadId);
    if (thread) {
      const now = Date.now();
      const newCommentCount = thread.commentCount + 1;
      const newEngagementScore = (thread.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.threadId, {
        commentCount: newCommentCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });

      // Notify thread owner (email) via notification engine
      await emitNotificationEvent(ctx, {
        type: "thread_comment",
        threadId: args.threadId,
        threadCommentId: commentId,
        actorUserId: user._id,
        parentCommentId: args.parentCommentId,
        contentSnippet: args.content.slice(0, 200),
      });

      // Process @mentions in the thread comment
      const mentionedUserIds = parseMentionsFromHtml(args.content);
      if (mentionedUserIds.length > 0) {
        await emitNotificationEvent(ctx, {
          type: "mention",
          actorUserId: user._id,
          mentionedUserIds,
          contentType: "thread",
          contentId: args.threadId as string,
          contentTitle: thread.title,
          contextSnippet: args.content.slice(0, 200),
          threadId: args.threadId,
          threadCommentId: commentId,
          excludeUserIds: [thread.userId as string],
        });
      }
    }

    return commentId;
  },
});

export const getComments = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("threadComments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    const sorted = comments.sort((a, b) => a.createdAt - b.createdAt);

    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    const enrichedComments = await Promise.all(
      sorted.map(async (comment) => {
        if (comment.isDeleted) {
          return {
            ...comment,
            content: "[deleted]",
            upvotes: 0,
            hasUpvoted: false,
            userName: "[deleted]",
            userAvatar: "",
          };
        }

        const commentUser = await ctx.db.get(comment.userId);

        let hasUpvoted = false;
        if (userId) {
          const existing = await ctx.db
            .query("threadCommentUpvotes")
            .withIndex("by_comment_and_user", (q) =>
              q.eq("commentId", comment._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existing;
        }

        return {
          ...comment,
          upvotes: comment.upvotes ?? 0,
          hasUpvoted,
          userName: commentUser?.name ?? "Unknown User",
          userAvatar: commentUser?.avatarUrlId ?? "",
        };
      })
    );

    return enrichedComments;
  },
});

export const editComment = mutation({
  args: {
    commentId: v.id("threadComments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found");
    }
    if (comment.userId !== user._id) {
      throw new Error("You can only edit your own comments");
    }
    await ctx.db.patch(args.commentId, {
      content: args.content,
      editedAt: Date.now(),
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("threadComments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== user._id)
      throw new Error("You can only delete your own comments");

    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      upvotes: 0,
    });

    // Decrement thread engagement score and comment count
    const thread = await ctx.db.get(comment.threadId);
    if (thread) {
      const now = Date.now();
      const newCommentCount = Math.max(0, thread.commentCount - 1);
      const newEngagementScore = Math.max(
        0,
        (thread.engagementScore ?? 0) - 1
      );
      await ctx.db.patch(comment.threadId, {
        commentCount: newCommentCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
    }

    // Clean up comment upvotes
    const existingUpvotes = await ctx.db
      .query("threadCommentUpvotes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    await Promise.all(existingUpvotes.map((upvote) => ctx.db.delete(upvote._id)));
  },
});

export const toggleCommentUpvote = mutation({
  args: { commentId: v.id("threadComments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) throw new Error("Comment not found");

    const existing = await ctx.db
      .query("threadCommentUpvotes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", user._id)
      )
      .unique();

    const currentUpvotes = comment.upvotes ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const updatedCount = Math.max(currentUpvotes - 1, 0);
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: false };
    } else {
      await ctx.db.insert("threadCommentUpvotes", {
        commentId: args.commentId,
        userId: user._id,
        createdAt: Date.now(),
      });
      const updatedCount = currentUpvotes + 1;
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: true };
    }
  },
});

// ─── RAG Indexing (Internal) ────────────────────────────────────────────────

export const indexThreadInRag = internalAction({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.body ? `${args.title}\n\n${args.body}` : args.title;
    const { entryId } = await rag.add(ctx, {
      namespace: "threads",
      text,
      key: args.threadId,
    });
    await ctx.runMutation(internal.threads.updateThreadEntryId, {
      threadId: args.threadId,
      entryId,
    });
  },
});

export const updateThreadEntryId = internalMutation({
  args: {
    threadId: v.id("threads"),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (thread) {
      await ctx.db.patch(args.threadId, { entryId: args.entryId });
    }
  },
});

export const deleteThreadFromRag = internalAction({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    await rag.delete(ctx, { entryId: args.entryId as EntryId });
  },
});

export const getThread = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const fullTextSearchThreads = internalQuery({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withSearchIndex("allFields", (q) => q.search("allFields", args.query))
      .take(args.limit);
  },
});

export const getThreadsByEntryIdsPublic = query({
  args: {
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const threads = await Promise.all(
      args.entryIds.map(async (entryId) => {
        const thread = await ctx.db
          .query("threads")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .first();
        if (!thread) return null;

        const [creator, focusArea] = await Promise.all([
          ctx.db.get(thread.userId),
          ctx.db.get(thread.focusAreaId),
        ]);

        return {
          _id: thread._id,
          title: thread.title,
          body: thread.body,
          upvoteCount: thread.upvoteCount,
          commentCount: thread.commentCount,
          creatorName: creator?.name ?? "Unknown User",
          createdAt: thread.createdAt,
          spaceName: focusArea?.name ?? null,
          spaceIcon: focusArea?.icon ?? null,
          spaceId: focusArea?._id ?? null,
        };
      })
    );
    return threads.filter(
      (t): t is NonNullable<typeof t> => t !== null
    );
  },
});

export const getThreadsByEntryIdsInternal = internalQuery({
  args: {
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const threads = await Promise.all(
      args.entryIds.map(async (entryId) => {
        return await ctx.db
          .query("threads")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .first();
      })
    );
    return threads.filter(
      (t): t is NonNullable<typeof t> => t !== null
    );
  },
});

// ─── Backfill ───────────────────────────────────────────────────────────────

export const getThreadsWithoutEntryId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("entryId"), undefined))
      .take(100);
    return threads.map((t) => ({ _id: t._id }));
  },
});

export const backfillThread = internalAction({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ message: string; entryId: string }> => {
    const thread = await ctx.runQuery(internal.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) throw new Error("Thread not found");
    if (thread.entryId) {
      return { message: "Already indexed", entryId: thread.entryId };
    }

    const text = thread.body ? `${thread.title}\n\n${thread.body}` : thread.title;
    const { entryId } = await rag.add(ctx, {
      namespace: "threads",
      text,
      key: args.threadId,
    });
    await ctx.runMutation(internal.threads.updateThreadEntryId, {
      threadId: args.threadId,
      entryId,
    });
    return { message: "Thread backfilled", entryId };
  },
});

export const backfillAllThreads = internalAction({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.runQuery(internal.threads.getThreadsWithoutEntryId, {});
    let scheduled = 0;
    for (const thread of threads) {
      await ctx.scheduler.runAfter(
        scheduled * 200,
        internal.threads.backfillThread,
        { threadId: thread._id }
      );
      scheduled++;
    }
    return { scheduled };
  },
});

// ─── RAG Re-indexing (embedding model migration) ────────────────────────────

export const getAllThreadIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query("threads").collect();
    return threads.map((t) => ({ _id: t._id, title: t.title, body: t.body }));
  },
});

export const reindexThreadInRag = internalAction({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.body ? `${args.title}\n\n${args.body}` : args.title;
    const { entryId } = await rag.add(ctx, {
      namespace: "threads",
      text,
      key: args.threadId,
    });
    await ctx.runMutation(internal.threads.updateThreadEntryId, {
      threadId: args.threadId,
      entryId,
    });
  },
});

export const reindexAllThreadsInRag = internalAction({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.runQuery(internal.threads.getAllThreadIds, {});
    let scheduled = 0;
    for (const thread of threads) {
      await ctx.scheduler.runAfter(
        scheduled * 200,
        internal.threads.reindexThreadInRag,
        { threadId: thread._id, title: thread.title, body: thread.body },
      );
      scheduled++;
    }
    return { scheduled };
  },
});

export const backfillAllFieldsForThreads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("allFields"), undefined))
      .take(100);
    let updated = 0;
    for (const thread of threads) {
      await ctx.db.patch(thread._id, {
        allFields: buildAllFields(thread.title, thread.body),
      });
      updated++;
    }
    return { updated };
  },
});
