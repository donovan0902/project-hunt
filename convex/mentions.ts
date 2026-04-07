/**
 * Mention parsing utilities and user search for @-mention typeahead.
 *
 * Mention notification dispatch has been centralized in notificationEngine.ts.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

// ─── Mention parsing ─────────────────────────────────────────────────────────

const HTML_MENTION_RE = /class="mention"[^>]*data-id="([^"]+)"/g;

/**
 * Extracts mentioned user IDs from Quill HTML content.
 * Mention format: <span class="mention" data-id="userId" ...>@Name</span>
 */
export function parseMentionsFromHtml(html: string): string[] {
  const ids: string[] = [];
  let match;
  while ((match = HTML_MENTION_RE.exec(html)) !== null) {
    ids.push(match[1]);
  }
  HTML_MENTION_RE.lastIndex = 0;
  return [...new Set(ids)];
}

// ─── User search for mention typeahead ───────────────────────────────────────

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);
    const limit = args.limit ?? 8;

    if (!args.query.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(limit + 1); // fetch one extra to account for filtering current user

    return results
      .filter((u) => u._id !== currentUser?._id)
      .slice(0, limit)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        avatarUrlId: u.avatarUrlId ?? "",
      }));
  },
});
