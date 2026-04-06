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

    const isFirstPage = !args.paginationOpts.cursor;
    let pinnedProjects: Doc<"projects">[] = [];
    if (isFirstPage) {
      pinnedProjects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .filter((q) => q.eq(q.field("pinned"), true))
        .collect();
    }

    // Native Convex cursor-based pagination on precomputed scores
    const paginatedResult = await ctx.db
      .query("userFeedEntries")
      .withIndex("by_userId_personalizedScore", (q) =>
        q.eq("userId", currentUser._id)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Resolve project docs, filter out pinned (already prepended) and inactive
    const pinnedIds = new Set(pinnedProjects.map((p) => p._id as string));
    const resolvedProjects = (
      await Promise.all(
        paginatedResult.page
          .filter((entry) => !pinnedIds.has(entry.projectId as string))
          .map((entry) => ctx.db.get(entry.projectId))
      )
    ).filter(
      (p): p is Doc<"projects"> => p !== null && p.status === "active"
    );

    const allProjects = [...pinnedProjects, ...resolvedProjects];
    const enriched = await enrichProjects(ctx, allProjects, currentUser._id);

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

  const isFirstPage = !args.paginationOpts.cursor;
  let pinnedProjects: Doc<"projects">[] = [];
  if (isFirstPage) {
    pinnedProjects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.eq(q.field("pinned"), true))
      .collect();
  }

  const paginatedResult = await ctx.db
    .query("projects")
    .withIndex("by_status_hotScore", (q) => q.eq("status", "active"))
    .filter((q) => q.neq(q.field("pinned"), true))
    .order("desc")
    .paginate(args.paginationOpts);

  const projectsToEnrich = [...pinnedProjects, ...paginatedResult.page];
  const enriched = await enrichProjects(ctx, projectsToEnrich, userId);

  return {
    ...paginatedResult,
    page: enriched,
  };
}
