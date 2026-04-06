import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { getCurrentUser } from "../users";
import { enrichProjects } from "./helpers";

export const listPersonalizedFeed = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser) {
      // Anonymous users: fall back to global hotScore feed
      return fallbackToGlobalFeed(ctx, args);
    }

    // Check if user has feed entries
    const hasEntries = await ctx.db
      .query("userFeedEntries")
      .withIndex("by_userId_personalizedScore", (q) =>
        q.eq("userId", currentUser._id)
      )
      .first();

    if (!hasEntries) {
      // No precomputed feed yet — fall back to global feed
      return fallbackToGlobalFeed(ctx, args);
    }

    // Native Convex cursor-based pagination on precomputed scores
    const paginatedResult = await ctx.db
      .query("userFeedEntries")
      .withIndex("by_userId_personalizedScore", (q) =>
        q.eq("userId", currentUser._id)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Resolve project docs, filter inactive
    const resolvedProjects = (
      await Promise.all(
        paginatedResult.page.map((entry) => ctx.db.get(entry.projectId))
      )
    ).filter(
      (p): p is Doc<"projects"> => p !== null && p.status === "active"
    );

    const enriched = await enrichProjects(ctx, resolvedProjects, currentUser._id);

    return {
      ...paginatedResult,
      page: enriched,
    };
  },
});

async function fallbackToGlobalFeed(
  ctx: QueryCtx,
  args: { paginationOpts: { numItems: number; cursor: string | null } }
) {
  const currentUser = await getCurrentUser(ctx);
  const userId = currentUser?._id;

  const paginatedResult = await ctx.db
    .query("projects")
    .withIndex("by_status_hotScore", (q) => q.eq("status", "active"))
    .order("desc")
    .paginate(args.paginationOpts);

  const enriched = await enrichProjects(ctx, paginatedResult.page, userId);

  return {
    ...paginatedResult,
    page: enriched,
  };
}
