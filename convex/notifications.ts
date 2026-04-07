/**
 * Notification read-side queries.
 *
 * All write-side notification logic (creation, aggregation, email enqueueing)
 * has been centralized in notificationEngine.ts.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientUserId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const getNotifications = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_last_activity", (q) =>
        q.eq("recipientUserId", user._id)
      )
      .order("desc")
      .take(args.limit);

    return await Promise.all(
      notifications.map(async (notification) => {
        const [actor, project, comment, thread] = await Promise.all([
          ctx.db.get(notification.actorUserId),
          notification.projectId ? ctx.db.get(notification.projectId) : null,
          notification.commentId ? ctx.db.get(notification.commentId) : null,
          notification.threadId ? ctx.db.get(notification.threadId) : null,
        ]);

        return {
          _id: notification._id,
          type: notification.type,
          projectId: notification.projectId ?? null,
          threadId: notification.threadId ?? null,
          commentId: notification.commentId,
          count: notification.count,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          lastActivityAt: notification.lastActivityAt,
          actorName: actor?.name ?? "Someone",
          actorAvatar: actor?.avatarUrlId ?? "",
          projectName: project?.name ?? null,
          threadTitle: thread?.title ?? null,
          threadCommentId: notification.threadCommentId ?? null,
          isReply: Boolean(comment?.parentCommentId),
        };
      })
    );
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientUserId", user._id).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});
