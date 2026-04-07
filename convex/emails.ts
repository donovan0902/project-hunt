import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import type { Doc } from "./_generated/dataModel";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  renderWeeklyDigestEmail,
  renderSpaceActivityEmail,
  renderCommentActivityEmail,
  renderFollowedCommentEmail,
  renderFollowedProjectUpdateEmail,
  renderMentionEmail,
  type WeeklyDigestPayload,
  type SpaceActivityPayload,
  type CommentActivityPayload,
  type FollowedCommentPayload,
  type FollowedProjectUpdatePayload,
  type MentionActivityPayload,
} from "./emailRenderer";

// ─── Constants ────────────────────────────────────────────────────────────────

export const EMAIL_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EmailCategory = "weeklyDigest" | "spaceActivity" | "projectActivity" | "followedProjectComment" | "followedProjectUpdate" | "mentions";
type EmailRecipient = {
  name: string;
  email: string | null;
};

function getAppBaseUrl(): string {
  const explicitBaseUrl =
    process.env.APP_URL ?? "http://localhost:3000";
  return explicitBaseUrl.endsWith("/")
    ? explicitBaseUrl.slice(0, -1)
    : explicitBaseUrl;
}

/**
 * Checks whether a user has a specific email category enabled.
 * Returns true if the preference is undefined (default opt-in).
 */
export function isEmailEnabled(
  user: Doc<"users">,
  category: EmailCategory
): boolean {
  const prefs = user.emailPreferences;
  if (!prefs) return true;
  const value = prefs[category];
  return value !== false;
}

// ─── Internal: sendEmail (SES v2) ────────────────────────────────────────────

export const sendEmail = internalAction({
  args: {
    userId: v.id("users"),
    type: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const recipient: EmailRecipient | null = await ctx.runQuery(
      internal.users.getEmailRecipient,
      {
        userId: args.userId,
      }
    );

    if (!recipient) {
      throw new Error(`Cannot send email to missing user ${args.userId}`);
    }

    if (!recipient.email) {
      throw new Error(`User ${args.userId} does not have an email address`);
    }

    let subject: string;
    let html: string;
    let text: string | undefined;

    const baseUrl = getAppBaseUrl();
    const profileUrl = `${baseUrl}/profile/${args.userId}`;

    if (args.type === "weekly_digest") {
      const rendered = renderWeeklyDigestEmail({
        recipientName: recipient.name,
        payload: args.payload as WeeklyDigestPayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else if (args.type === "space_activity") {
      const rendered = renderSpaceActivityEmail({
        recipientName: recipient.name,
        payload: args.payload as SpaceActivityPayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else if (args.type === "comment_activity") {
      const rendered = renderCommentActivityEmail({
        recipientName: recipient.name,
        payload: args.payload as CommentActivityPayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else if (args.type === "followed_project_comment") {
      const rendered = renderFollowedCommentEmail({
        recipientName: recipient.name,
        payload: args.payload as FollowedCommentPayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else if (args.type === "followed_project_update") {
      const rendered = renderFollowedProjectUpdateEmail({
        recipientName: recipient.name,
        payload: args.payload as FollowedProjectUpdatePayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else if (args.type === "mention_activity") {
      const rendered = renderMentionEmail({
        recipientName: recipient.name,
        payload: args.payload as MentionActivityPayload,
        baseUrl,
        profileUrl,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else {
      console.warn(
        `[sendEmail] No renderer for type "${args.type}", skipping`
      );
      return;
    }

    const client = new SESv2Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    try {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: process.env.SES_FROM_EMAIL!,
          Destination: { ToAddresses: [recipient.email] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: html, Charset: "UTF-8" },
                ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
              },
            },
          },
        })
      );
    } finally {
      client.destroy();
    }
  },
});

// ─── Queue drainer ───────────────────────────────────────────────────────────

const DRAIN_BATCH_SIZE = 14;

export const getPendingEmails = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailQueue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(args.limit);
  },
});

export const markEmailSent = internalMutation({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "sent",
      sentAt: Date.now(),
    });
  },
});

export const markEmailFailed = internalMutation({
  args: { emailId: v.id("emailQueue"), reason: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "failed",
      failureReason: args.reason,
    });
  },
});

export const drainEmailQueue = internalAction({
  handler: async (ctx) => {
    const batch = await ctx.runQuery(internal.emails.getPendingEmails, {
      limit: DRAIN_BATCH_SIZE,
    });

    if (batch.length === 0) return;

    let sent = 0;
    let failed = 0;

    for (const email of batch) {
      try {
        await ctx.runAction(internal.emails.sendEmail, {
          userId: email.userId,
          type: email.type,
          payload: email.payload,
        });
        await ctx.runMutation(internal.emails.markEmailSent, {
          emailId: email._id,
        });
        sent++;
      } catch (error) {
        await ctx.runMutation(internal.emails.markEmailFailed, {
          emailId: email._id,
          reason: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    console.log(
      `[drainEmailQueue] Processed ${batch.length} emails: ${sent} sent, ${failed} failed`
    );
  },
});

// ─── User-facing: preferences ─────────────────────────────────────────────────

export const getEmailPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const prefs = user.emailPreferences;
    return {
      weeklyDigest: prefs?.weeklyDigest !== false,
      spaceActivity: prefs?.spaceActivity !== false,
      projectActivity: prefs?.projectActivity !== false,
      followedProjectComment: prefs?.followedProjectComment !== false,
      followedProjectUpdate: prefs?.followedProjectUpdate !== false,
      mentions: prefs?.mentions !== false,
    };
  },
});

export const updateEmailPreferences = mutation({
  args: {
    weeklyDigest: v.optional(v.boolean()),
    spaceActivity: v.optional(v.boolean()),
    projectActivity: v.optional(v.boolean()),
    followedProjectComment: v.optional(v.boolean()),
    followedProjectUpdate: v.optional(v.boolean()),
    mentions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const current = user.emailPreferences ?? {};
    const updated = {
      weeklyDigest: args.weeklyDigest ?? current.weeklyDigest,
      spaceActivity: args.spaceActivity ?? current.spaceActivity,
      projectActivity: args.projectActivity ?? current.projectActivity,
      followedProjectComment: args.followedProjectComment ?? current.followedProjectComment,
      followedProjectUpdate: args.followedProjectUpdate ?? current.followedProjectUpdate,
      mentions: args.mentions ?? current.mentions,
    };

    await ctx.db.patch(user._id, { emailPreferences: updated });
  },
});
