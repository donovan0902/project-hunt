/**
 * Centralized Notification Engine
 *
 * All notification side effects (in-app + email) flow through this module.
 * Call sites emit a typed event via `emitNotificationEvent(ctx, event)` and the
 * engine handles recipient resolution, preference checking, dedup, and delivery.
 *
 * Weekly digest is excluded — it's a fundamentally different batch/cron pattern.
 */

import type { MutationCtx } from "./_generated/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { isEmailEnabled, EMAIL_DEDUP_WINDOW_MS } from "./emails";

// ─── Constants ──────────────────────────────────────────────────────────────

const NOTIFICATION_HISTORY_LIMIT = 50;

// ─── Event Type System ──────────────────────────────────────────────────────

type CommentEvent = {
  type: "comment";
  projectId: Id<"projects">;
  commentId: Id<"comments">;
  actorUserId: Id<"users">;
  parentCommentId?: Id<"comments">;
  contentSnippet: string;
};

type ThreadCommentEvent = {
  type: "thread_comment";
  threadId: Id<"threads">;
  threadCommentId: Id<"threadComments">;
  actorUserId: Id<"users">;
  parentCommentId?: Id<"threadComments">;
  contentSnippet: string;
};

type MentionEvent = {
  type: "mention";
  actorUserId: Id<"users">;
  mentionedUserIds: string[];
  contentType: "project" | "thread";
  contentId: string;
  contentTitle: string;
  contextSnippet?: string;
  // IDs of project/thread for linking in-app notifications
  projectId?: Id<"projects">;
  threadId?: Id<"threads">;
  commentId?: Id<"comments">;
  threadCommentId?: Id<"threadComments">;
  excludeUserIds?: string[];
};

type UpvoteEvent = {
  type: "upvote";
  projectId: Id<"projects">;
  actorUserId: Id<"users">;
  isRemoval: boolean;
};

type FollowEvent = {
  type: "follow";
  projectId: Id<"projects">;
  actorUserId: Id<"users">;
};

type ProjectUpdateEvent = {
  type: "project_update";
  projectId: Id<"projects">;
  actorUserId: Id<"users">;
};

type ThreadCreatedEvent = {
  type: "thread_created";
  threadId: Id<"threads">;
  focusAreaId: Id<"focusAreas">;
  actorUserId: Id<"users">;
  contentTitle: string;
};

type ProjectAddedToSpaceEvent = {
  type: "project_added_to_space";
  projectId: Id<"projects">;
  focusAreaId: Id<"focusAreas">;
  actorUserId: Id<"users">;
  contentTitle: string;
};

export type NotificationEvent =
  | CommentEvent
  | ThreadCommentEvent
  | MentionEvent
  | UpvoteEvent
  | FollowEvent
  | ProjectUpdateEvent
  | ThreadCreatedEvent
  | ProjectAddedToSpaceEvent;

// ─── Shared Primitives ──────────────────────────────────────────────────────

type EmailPreferenceKey =
  | "projectActivity"
  | "followedProjectComment"
  | "followedProjectUpdate"
  | "mentions"
  | "spaceActivity";

async function pruneNotifications(
  ctx: MutationCtx,
  recipientUserId: Id<"users">
) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_last_activity", (q) =>
      q.eq("recipientUserId", recipientUserId)
    )
    .order("desc")
    .collect();

  const overflow = notifications.slice(NOTIFICATION_HISTORY_LIMIT);
  await Promise.all(overflow.map((n) => ctx.db.delete(n._id)));
}

async function insertInAppNotification(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    type: "comment" | "reply" | "follow" | "project_update" | "followed_project_comment" | "mention";
    projectId?: Id<"projects">;
    threadId?: Id<"threads">;
    commentId?: Id<"comments">;
    threadCommentId?: Id<"threadComments">;
  }
) {
  const now = Date.now();
  await ctx.db.insert("notifications", {
    recipientUserId: args.recipientUserId,
    actorUserId: args.actorUserId,
    projectId: args.projectId,
    threadId: args.threadId,
    threadCommentId: args.threadCommentId,
    type: args.type,
    commentId: args.commentId,
    isRead: false,
    createdAt: now,
    lastActivityAt: now,
  });
  await pruneNotifications(ctx, args.recipientUserId);
}

/**
 * Consolidated email enqueueing with eligibility checks, preference checking,
 * and 30-minute dedup window. Replaces the pattern previously duplicated in
 * commentNotifications.ts, followNotifications.ts, spaceNotifications.ts, and mentions.ts.
 */
async function enqueueEmailIfEligible(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    emailType: string;
    preferenceKey: EmailPreferenceKey;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  const recipient = await ctx.db.get(args.recipientUserId);
  if (!recipient) return;
  if (!recipient.email) return;
  if (!recipient.onboardingCompleted) return;
  if (!isEmailEnabled(recipient, args.preferenceKey)) return;

  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recent = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", args.recipientUserId)
        .eq("type", args.emailType)
        .gte("createdAt", cutoff)
    )
    .first();
  if (recent) return;

  await ctx.db.insert("emailQueue", {
    userId: args.recipientUserId,
    type: args.emailType,
    status: "pending",
    payload: args.payload,
    createdAt: Date.now(),
  });
}

// ─── Entry Point ────────────────────────────────────────────────────────────

/**
 * Main entry point for the notification engine.
 * Call from any mutation to emit a notification event.
 *
 * In-app notifications are created synchronously within the caller's transaction.
 * Fan-out for multi-recipient events is deferred via ctx.scheduler.runAfter(0, ...).
 */
export async function emitNotificationEvent(
  ctx: MutationCtx,
  event: NotificationEvent
): Promise<void> {
  switch (event.type) {
    case "comment":
      return handleCommentEvent(ctx, event);
    case "thread_comment":
      return handleThreadCommentEvent(ctx, event);
    case "mention":
      return handleMentionEvent(ctx, event);
    case "upvote":
      return handleUpvoteEvent(ctx, event);
    case "follow":
      return handleFollowEvent(ctx, event);
    case "project_update":
      await ctx.scheduler.runAfter(
        0,
        internal.notificationEngine.processProjectUpdate,
        {
          projectId: event.projectId,
          actorUserId: event.actorUserId,
        }
      );
      return;
    case "thread_created":
      await ctx.scheduler.runAfter(
        0,
        internal.notificationEngine.processSpaceNotification,
        {
          focusAreaId: event.focusAreaId,
          contentType: "thread" as const,
          contentId: event.threadId,
          contentTitle: event.contentTitle,
          creatorUserId: event.actorUserId,
        }
      );
      return;
    case "project_added_to_space":
      await ctx.scheduler.runAfter(
        0,
        internal.notificationEngine.processSpaceNotification,
        {
          focusAreaId: event.focusAreaId,
          contentType: "project" as const,
          contentId: event.projectId,
          contentTitle: event.contentTitle,
          creatorUserId: event.actorUserId,
        }
      );
      return;
  }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

async function handleFollowEvent(ctx: MutationCtx, event: FollowEvent) {
  const project = await ctx.db.get(event.projectId);
  if (!project) return;
  if (project.userId === event.actorUserId) return;

  await insertInAppNotification(ctx, {
    recipientUserId: project.userId,
    actorUserId: event.actorUserId,
    projectId: event.projectId,
    type: "follow",
  });
}

async function handleUpvoteEvent(ctx: MutationCtx, event: UpvoteEvent) {
  const project = await ctx.db.get(event.projectId);
  if (!project) return;
  if (project.userId === event.actorUserId) return;

  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_project_type", (q) =>
      q
        .eq("recipientUserId", project.userId)
        .eq("projectId", event.projectId)
        .eq("type", "upvote")
    )
    .unique();

  // If removing an upvote and there's no existing notification, nothing to do
  if (!existing && event.isRemoval) return;

  // Recount upvotes from other users
  const upvotes = await ctx.db
    .query("upvotes")
    .withIndex("by_project", (q) => q.eq("projectId", event.projectId))
    .collect();

  const filteredUpvotes = upvotes.filter(
    (u) => u.userId !== project.userId
  );
  const count = filteredUpvotes.length;

  if (count === 0) {
    if (existing) await ctx.db.delete(existing._id);
    return;
  }

  const latestUpvote = filteredUpvotes.sort(
    (a, b) => b.createdAt - a.createdAt
  )[0];
  if (!latestUpvote) return;

  const now = Date.now();

  if (existing) {
    const patch: {
      count: number;
      actorUserId: Id<"users">;
      lastActivityAt?: number;
      isRead?: boolean;
    } = {
      count,
      actorUserId: latestUpvote.userId,
    };
    // Only mark unread for new upvotes, not removals
    if (!event.isRemoval) {
      patch.lastActivityAt = now;
      patch.isRead = false;
    }
    await ctx.db.patch(existing._id, patch);
    return;
  }

  // Create new aggregated upvote notification
  await ctx.db.insert("notifications", {
    recipientUserId: project.userId,
    actorUserId: latestUpvote.userId,
    projectId: event.projectId,
    type: "upvote",
    count,
    isRead: false,
    createdAt: now,
    lastActivityAt: now,
  });
  await pruneNotifications(ctx, project.userId);
}

async function handleMentionEvent(ctx: MutationCtx, event: MentionEvent) {
  const excludeSet = new Set(event.excludeUserIds ?? []);
  const recipientIds = [...new Set(event.mentionedUserIds)].filter(
    (id) => id !== (event.actorUserId as string) && !excludeSet.has(id)
  );

  if (recipientIds.length === 0) return;

  const actor = await ctx.db.get(event.actorUserId);
  const actorName = actor?.name ?? "Someone";

  for (const recipientId of recipientIds) {
    const recipientUserId = recipientId as Id<"users">;
    let recipient: Doc<"users"> | null;
    try {
      recipient = await ctx.db.get(recipientUserId);
    } catch {
      // recipientId was parsed from user-controlled HTML and may not be valid
      continue;
    }
    if (!recipient) continue;

    await insertInAppNotification(ctx, {
      recipientUserId,
      actorUserId: event.actorUserId,
      type: "mention",
      projectId: event.projectId,
      threadId: event.threadId,
      commentId: event.commentId,
      threadCommentId: event.threadCommentId,
    });

    await enqueueEmailIfEligible(ctx, {
      recipientUserId,
      emailType: "mention_activity",
      preferenceKey: "mentions",
      payload: {
        mentionerName: actorName,
        contentType: event.contentType,
        contentId: event.contentId,
        contentTitle: event.contentTitle,
        commentSnippet: event.contextSnippet?.slice(0, 200),
      },
    });
  }
}

async function handleCommentEvent(ctx: MutationCtx, event: CommentEvent) {
  const project = await ctx.db.get(event.projectId);
  if (!project) return;

  const actor = await ctx.db.get(event.actorUserId);
  const actorName = actor?.name ?? "Someone";

  // 1. Notify project owner (in-app + email)
  if (project.userId !== event.actorUserId) {
    await insertInAppNotification(ctx, {
      recipientUserId: project.userId,
      actorUserId: event.actorUserId,
      projectId: event.projectId,
      type: "comment",
      commentId: event.commentId,
    });

    await enqueueEmailIfEligible(ctx, {
      recipientUserId: project.userId,
      emailType: "comment_activity",
      preferenceKey: "projectActivity",
      payload: {
        contentType: "project",
        contentId: event.projectId as string,
        contentTitle: project.name,
        commenterName: actorName,
        commentSnippet: event.contentSnippet,
      },
    });
  }

  // 2. Notify parent comment author for replies (in-app + email)
  if (event.parentCommentId) {
    const parentComment = await ctx.db.get(event.parentCommentId);
    if (
      parentComment &&
      !parentComment.isDeleted &&
      parentComment.userId !== event.actorUserId &&
      parentComment.userId !== project.userId
    ) {
      await insertInAppNotification(ctx, {
        recipientUserId: parentComment.userId,
        actorUserId: event.actorUserId,
        projectId: event.projectId,
        type: "reply",
        commentId: event.commentId,
      });

      await enqueueEmailIfEligible(ctx, {
        recipientUserId: parentComment.userId,
        emailType: "comment_activity",
        preferenceKey: "projectActivity",
        payload: {
          contentType: "project",
          contentId: event.projectId as string,
          contentTitle: project.name,
          commenterName: actorName,
          commentSnippet: event.contentSnippet,
          isReply: true,
        },
      });
    }
  }

  // 3. Fan out to project followers (scheduled)
  await ctx.scheduler.runAfter(
    0,
    internal.notificationEngine.processFollowerComment,
    {
      projectId: event.projectId,
      actorUserId: event.actorUserId,
      commentId: event.commentId,
    }
  );
}

async function handleThreadCommentEvent(
  ctx: MutationCtx,
  event: ThreadCommentEvent
) {
  const thread = await ctx.db.get(event.threadId);
  if (!thread) return;

  // Notify thread owner (email only — no in-app notification for thread comments)
  if (thread.userId !== event.actorUserId) {
    const actor = await ctx.db.get(event.actorUserId);
    const actorName = actor?.name ?? "Someone";

    await enqueueEmailIfEligible(ctx, {
      recipientUserId: thread.userId,
      emailType: "comment_activity",
      preferenceKey: "projectActivity",
      payload: {
        contentType: "thread",
        contentId: event.threadId as string,
        contentTitle: thread.title,
        commenterName: actorName,
        commentSnippet: event.contentSnippet,
      },
    });
  }
}

// ─── Scheduled Fan-Out: Project Followers ───────────────────────────────────

/**
 * Notifies all project followers about an update (in-app + email).
 * Scheduled via ctx.scheduler.runAfter from handleProjectUpdateEvent.
 */
export const processProjectUpdate = internalMutation({
  args: {
    projectId: v.id("projects"),
    actorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const follows = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const recipients = Array.from(
      new Set(follows.map((f) => f.userId))
    ).filter((userId) => userId !== args.actorUserId);

    if (recipients.length === 0) return;

    const actor = await ctx.db.get(args.actorUserId);
    const actorName = actor?.name ?? "Someone";

    await Promise.all(
      recipients.map(async (recipientUserId) => {
        await insertInAppNotification(ctx, {
          recipientUserId,
          actorUserId: args.actorUserId,
          projectId: args.projectId,
          type: "project_update",
        });

        await enqueueEmailIfEligible(ctx, {
          recipientUserId,
          emailType: "followed_project_update",
          preferenceKey: "followedProjectUpdate",
          payload: {
            projectId: args.projectId as string,
            projectName: project.name,
            actorName,
          },
        });
      })
    );
  },
});

/**
 * Notifies project followers about a new comment (aggregated in-app + email).
 * Excludes both the commenter and the project owner.
 */
export const processFollowerComment = internalMutation({
  args: {
    projectId: v.id("projects"),
    actorUserId: v.id("users"),
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const follows = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const recipientIds = Array.from(
      new Set(follows.map((f) => f.userId))
    ).filter(
      (userId) => userId !== args.actorUserId && userId !== project.userId
    );

    if (recipientIds.length === 0) return;

    const [actor, comment] = await Promise.all([
      ctx.db.get(args.actorUserId),
      ctx.db.get(args.commentId),
    ]);
    const commenterName = actor?.name ?? "Someone";
    const commentSnippet = (comment?.content ?? "").slice(0, 200);

    const now = Date.now();
    await Promise.all(
      recipientIds.map(async (recipientUserId) => {
        // Upsert aggregated followed_project_comment notification
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_recipient_project_type", (q) =>
            q
              .eq("recipientUserId", recipientUserId)
              .eq("projectId", args.projectId)
              .eq("type", "followed_project_comment")
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            count: (existing.count ?? 0) + 1,
            actorUserId: args.actorUserId,
            commentId: args.commentId,
            lastActivityAt: now,
            isRead: false,
          });
        } else {
          await ctx.db.insert("notifications", {
            recipientUserId,
            actorUserId: args.actorUserId,
            projectId: args.projectId,
            type: "followed_project_comment",
            commentId: args.commentId,
            count: 1,
            isRead: false,
            createdAt: now,
            lastActivityAt: now,
          });
          await pruneNotifications(ctx, recipientUserId);
        }

        await enqueueEmailIfEligible(ctx, {
          recipientUserId,
          emailType: "followed_project_comment",
          preferenceKey: "followedProjectComment",
          payload: {
            projectId: args.projectId as string,
            projectName: project.name,
            commenterName,
            commentSnippet,
          },
        });
      })
    );
  },
});

// ─── Scheduled Fan-Out: Space Followers ─────────────────────────────────────

export const getSpaceInfo = internalQuery({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const space = await ctx.db.get(args.focusAreaId);
    if (!space) return null;
    return {
      _id: space._id,
      name: space.name,
      icon: space.icon,
      isActive: space.isActive,
    };
  },
});

export const getSpaceFollowers = internalQuery({
  args: {
    focusAreaId: v.id("focusAreas"),
    excludeUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_focus_area", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .collect();

    const followers: Array<{ userId: typeof args.excludeUserId }> = [];

    for (const membership of memberships) {
      if (membership.userId === args.excludeUserId) continue;
      followers.push({ userId: membership.userId });
    }

    return followers;
  },
});

export const enqueueSpaceActivityEmailForUser = internalMutation({
  args: {
    userId: v.id("users"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await enqueueEmailIfEligible(ctx, {
      recipientUserId: args.userId,
      emailType: "space_activity",
      preferenceKey: "spaceActivity",
      payload: args.payload,
    });
  },
});

/**
 * Notifies space followers about new content (email only, no in-app).
 * Uses action because it queries followers then mutates per-user.
 */
export const processSpaceNotification = internalAction({
  args: {
    focusAreaId: v.id("focusAreas"),
    contentType: v.union(v.literal("project"), v.literal("thread")),
    contentId: v.string(),
    contentTitle: v.string(),
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const space = await ctx.runQuery(
      internal.notificationEngine.getSpaceInfo,
      { focusAreaId: args.focusAreaId }
    );
    if (!space || !space.isActive) return;

    const creatorUser = await ctx.runQuery(
      internal.users.getEmailRecipient,
      { userId: args.creatorUserId }
    );

    const followers = await ctx.runQuery(
      internal.notificationEngine.getSpaceFollowers,
      {
        focusAreaId: args.focusAreaId,
        excludeUserId: args.creatorUserId,
      }
    );

    if (followers.length === 0) return;

    const payload = {
      focusAreaName: space.name,
      focusAreaIcon: space.icon,
      contentType: args.contentType,
      contentId: args.contentId,
      contentTitle: args.contentTitle,
      creatorName: creatorUser?.name ?? "Someone",
    };

    for (const follower of followers) {
      await ctx.runMutation(
        internal.notificationEngine.enqueueSpaceActivityEmailForUser,
        {
          userId: follower.userId,
          payload,
        }
      );
    }

    console.log(
      `[notificationEngine] Enqueued space_activity emails for ${followers.length} follower(s) in space "${space.name}"`
    );
  },
});
