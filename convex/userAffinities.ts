import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ─── Scoring constants ───────────────────────────────────────────────────────

const SPACE_BOOST = 0.5; // per matching followed space, max 2 spaces = +1.0
const IMPLICIT_SPACE_BOOST = 0.25; // per space the user engaged in but doesn't follow
const CREATOR_BOOST = 0.4;
const DEPARTMENT_BOOST = 0.2;
const ENGAGED_PENALTY = -0.3;
const MAX_BOOST = 2.0;
const MIN_BOOST = -0.3;

// Recency decay: full weight within 7 days, linear decay to 0.3 over 90 days
const FULL_WEIGHT_MS = 7 * 24 * 60 * 60 * 1000;
const DECAY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_DECAY_WEIGHT = 0.3;
const CANDIDATE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

/** Fetch candidate projects: created OR versioned within the last 12 months. */
async function getCandidateProjects(ctx: QueryCtx | MutationCtx) {
  const cutoff = Date.now() - CANDIDATE_MAX_AGE_MS;

  // Query 1: projects created within 12 months
  const recentlyCreated = await ctx.db
    .query("projects")
    .withIndex("by_status", (q) =>
      q.eq("status", "active").gte("_creationTime", cutoff)
    )
    .collect();

  // Query 2: older projects with a version published within 12 months
  const recentlyVersioned = await ctx.db
    .query("projects")
    .withIndex("by_status_lastVersionAt", (q) =>
      q.eq("status", "active").gte("lastVersionAt", cutoff)
    )
    .collect();

  // Deduplicate
  const seen = new Set(recentlyCreated.map((p) => p._id));
  for (const p of recentlyVersioned) {
    if (!seen.has(p._id)) {
      recentlyCreated.push(p);
      seen.add(p._id);
    }
  }

  return recentlyCreated;
}

function recencyWeight(lastEngagedAt: number | undefined, now: number): number {
  if (!lastEngagedAt) return MIN_DECAY_WEIGHT;
  const age = now - lastEngagedAt;
  if (age <= FULL_WEIGHT_MS) return 1.0;
  if (age >= DECAY_WINDOW_MS) return MIN_DECAY_WEIGHT;
  return 1.0 - ((1.0 - MIN_DECAY_WEIGHT) * (age - FULL_WEIGHT_MS)) / (DECAY_WINDOW_MS - FULL_WEIGHT_MS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Affinity computation helper ─────────────────────────────────────────────

async function computeAffinitiesForUser(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<{
  followedSpaceIds: Id<"focusAreas">[];
  engagedCreatorIds: Id<"users">[];
  engagedProjectIds: Id<"projects">[];
  department: string | undefined;
  spaceLastEngagedAt: Record<string, number>;
  creatorLastEngagedAt: Record<string, number>;
}> {
  const user = await ctx.db.get(userId);

  // Followed spaces
  const userFocusAreas = await ctx.db
    .query("userFocusAreas")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const followedSpaceIds = userFocusAreas.map((ufa) => ufa.focusAreaId);

  // Recent engagements only — cap per table to stay within Convex read limits
  const MAX_ENGAGEMENTS_PER_TYPE = 200;

  const upvotes = await ctx.db
    .query("upvotes")
    .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(MAX_ENGAGEMENTS_PER_TYPE);

  const adoptions = await ctx.db
    .query("adoptions")
    .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(MAX_ENGAGEMENTS_PER_TYPE);

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(MAX_ENGAGEMENTS_PER_TYPE);

  // Collect all engaged project IDs with timestamps
  const projectEngagements = new Map<string, number>(); // projectId → latest timestamp
  for (const u of upvotes) {
    const existing = projectEngagements.get(u.projectId) ?? 0;
    projectEngagements.set(u.projectId, Math.max(existing, u.createdAt));
  }
  for (const a of adoptions) {
    const existing = projectEngagements.get(a.projectId) ?? 0;
    projectEngagements.set(a.projectId, Math.max(existing, a.createdAt));
  }
  for (const c of comments) {
    if (c.isDeleted) continue;
    const existing = projectEngagements.get(c.projectId) ?? 0;
    projectEngagements.set(c.projectId, Math.max(existing, c.createdAt));
  }

  const engagedProjectIds = [...projectEngagements.keys()] as Id<"projects">[];

  // Resolve creators and spaces from engaged projects
  const creatorLastEngagedAt: Record<string, number> = {};
  const spaceLastEngagedAt: Record<string, number> = {};
  const creatorIdSet = new Set<string>();

  for (const [projectId, lastEngaged] of projectEngagements) {
    const project = await ctx.db.get(projectId as Id<"projects">);
    if (!project) continue;

    // Track creator
    const creatorId = project.userId as string;
    creatorIdSet.add(creatorId);
    creatorLastEngagedAt[creatorId] = Math.max(
      creatorLastEngagedAt[creatorId] ?? 0,
      lastEngaged
    );

    // Track spaces
    const memberships = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    for (const m of memberships) {
      const spaceId = m.focusAreaId as string;
      spaceLastEngagedAt[spaceId] = Math.max(
        spaceLastEngagedAt[spaceId] ?? 0,
        lastEngaged
      );
    }
  }

  return {
    followedSpaceIds,
    engagedCreatorIds: [...creatorIdSet] as Id<"users">[],
    engagedProjectIds,
    department: user?.department,
    spaceLastEngagedAt,
    creatorLastEngagedAt,
  };
}

// ─── Shared feed scoring + upsert helpers ───────────────────────────────────

interface AffinityProfile {
  followedSpaceIds: Id<"focusAreas">[];
  engagedCreatorIds: Id<"users">[];
  engagedProjectIds: Id<"projects">[];
  department: string | undefined;
  spaceLastEngagedAt: Record<string, number>;
  creatorLastEngagedAt: Record<string, number>;
}

async function scoreProjects(
  ctx: MutationCtx,
  projects: Doc<"projects">[],
  affinity: AffinityProfile,
  now: number
): Promise<{ projectId: Id<"projects">; personalizedScore: number }[]> {
  const followedSpaceSet = new Set(
    affinity.followedSpaceIds.map((id) => id as string)
  );
  const engagedCreatorSet = new Set(
    affinity.engagedCreatorIds.map((id) => id as string)
  );
  const engagedProjectSet = new Set(
    affinity.engagedProjectIds.map((id) => id as string)
  );

  const entries: { projectId: Id<"projects">; personalizedScore: number }[] = [];

  for (const project of projects) {
    const baseScore = project.hotScore ?? 0;
    let boost = 0;

    const memberships = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    let spaceBoostCount = 0;
    for (const m of memberships) {
      const spaceId = m.focusAreaId as string;
      if (followedSpaceSet.has(spaceId)) {
        const weight = recencyWeight(affinity.spaceLastEngagedAt[spaceId], now);
        boost += SPACE_BOOST * weight;
        spaceBoostCount++;
        if (spaceBoostCount >= 2) break;
      } else if (affinity.spaceLastEngagedAt[spaceId] !== undefined) {
        const weight = recencyWeight(affinity.spaceLastEngagedAt[spaceId], now);
        boost += IMPLICIT_SPACE_BOOST * weight;
        spaceBoostCount++;
        if (spaceBoostCount >= 2) break;
      }
    }

    if (engagedCreatorSet.has(project.userId as string)) {
      const weight = recencyWeight(
        affinity.creatorLastEngagedAt[project.userId as string],
        now
      );
      boost += CREATOR_BOOST * weight;
    }

    if (affinity.department) {
      const creator = await ctx.db.get(project.userId);
      if (creator?.department === affinity.department) {
        boost += DEPARTMENT_BOOST;
      }
    }

    if (engagedProjectSet.has(project._id as string)) {
      boost += ENGAGED_PENALTY;
    }

    const clampedBoost = clamp(boost, MIN_BOOST, MAX_BOOST);
    entries.push({
      projectId: project._id,
      personalizedScore: baseScore * (1 + clampedBoost),
    });
  }

  return entries;
}

async function upsertFeedEntries(
  ctx: MutationCtx,
  userId: Id<"users">,
  entries: { projectId: Id<"projects">; personalizedScore: number }[],
  now: number
) {
  const oldEntries = await ctx.db
    .query("userFeedEntries")
    .withIndex("by_userId_personalizedScore", (q) => q.eq("userId", userId))
    .collect();
  for (const entry of oldEntries) {
    await ctx.db.delete(entry._id);
  }

  for (const entry of entries) {
    await ctx.db.insert("userFeedEntries", {
      userId,
      projectId: entry.projectId,
      personalizedScore: entry.personalizedScore,
      computedAt: now,
    });
  }
}

// ─── Registered functions ────────────────────────────────────────────────────

export const recomputeAffinities = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const affinities = await computeAffinitiesForUser(ctx, args.userId);

    const existing = await ctx.db
      .query("userAffinities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const doc = {
      userId: args.userId,
      ...affinities,
      lastRecomputedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.replace(existing._id, doc);
    } else {
      await ctx.db.insert("userAffinities", doc);
    }
  },
});

export const computeFeedForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Read affinity profile
    const affinity = await ctx.db
      .query("userAffinities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const profile: AffinityProfile = {
      followedSpaceIds: affinity?.followedSpaceIds ?? [],
      engagedCreatorIds: affinity?.engagedCreatorIds ?? [],
      engagedProjectIds: affinity?.engagedProjectIds ?? [],
      department: affinity?.department,
      spaceLastEngagedAt: affinity?.spaceLastEngagedAt ?? {},
      creatorLastEngagedAt: affinity?.creatorLastEngagedAt ?? {},
    };

    const projects = await getCandidateProjects(ctx);
    const entries = await scoreProjects(ctx, projects, profile, now);
    await upsertFeedEntries(ctx, args.userId, entries, now);
  },
});

// Stagger delay between scheduled user recomputes to avoid thundering herd.
// NOTE: At 5s per user with a 6-hour cron interval, this supports up to ~4,320
// users before runs overlap. If user count approaches that, consider lowering
// the stagger, increasing the cron interval, or switching to bounded batches
// with a continuation cursor.
const STAGGER_MS = 5_000; // 5 seconds between each user

export const refreshAllFeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_onboardingCompleted", (q) =>
        q.eq("onboardingCompleted", true)
      )
      .collect();

    for (let i = 0; i < users.length; i++) {
      await ctx.scheduler.runAfter(
        i * STAGGER_MS,
        internal.userAffinities.recomputeAffinitiesAndFeed,
        { userId: users[i]._id }
      );
    }

    return { scheduled: users.length };
  },
});

export const recomputeAffinitiesAndFeed = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // First recompute affinities
    const affinities = await computeAffinitiesForUser(ctx, args.userId);

    const existing = await ctx.db
      .query("userAffinities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const doc = {
      userId: args.userId,
      ...affinities,
      lastRecomputedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.replace(existing._id, doc);
    } else {
      await ctx.db.insert("userAffinities", doc);
    }

    // Then recompute feed using the freshly computed affinities
    const now = Date.now();
    const projects = await getCandidateProjects(ctx);
    const entries = await scoreProjects(ctx, projects, affinities, now);
    await upsertFeedEntries(ctx, args.userId, entries, now);
  },
});

export const backfillAllFeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_onboardingCompleted", (q) =>
        q.eq("onboardingCompleted", true)
      )
      .collect();

    for (let i = 0; i < users.length; i++) {
      await ctx.scheduler.runAfter(
        i * STAGGER_MS,
        internal.userAffinities.recomputeAffinitiesAndFeed,
        { userId: users[i]._id }
      );
    }

    return { scheduled: users.length };
  },
});

// ─── Incremental update helpers ──────────────────────────────────────────────

export async function incrementalAddEngagedProject(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
  creatorId: Id<"users">
) {
  const affinity = await ctx.db
    .query("userAffinities")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!affinity) return; // No affinity doc yet — will be created by next cron

  const now = Date.now();
  const engagedProjectIds = affinity.engagedProjectIds.includes(projectId)
    ? affinity.engagedProjectIds
    : [...affinity.engagedProjectIds, projectId];

  const engagedCreatorIds = affinity.engagedCreatorIds.includes(creatorId)
    ? affinity.engagedCreatorIds
    : [...affinity.engagedCreatorIds, creatorId];

  const creatorLastEngagedAt = { ...(affinity.creatorLastEngagedAt ?? {}) };
  creatorLastEngagedAt[creatorId as string] = now;

  // Track space engagement — look up which spaces this project belongs to
  const memberships = await ctx.db
    .query("projectSpaces")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const spaceLastEngagedAt = { ...(affinity.spaceLastEngagedAt ?? {}) };
  for (const m of memberships) {
    spaceLastEngagedAt[m.focusAreaId as string] = now;
  }

  await ctx.db.patch(affinity._id, {
    engagedProjectIds,
    engagedCreatorIds,
    creatorLastEngagedAt,
    spaceLastEngagedAt,
  });
}

export async function incrementalRemoveEngagedProject(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">
) {
  const affinity = await ctx.db
    .query("userAffinities")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!affinity) return;

  // Check if the user still has any other engagement with this project
  // before removing it from the affinity list
  const hasUpvote = await ctx.db
    .query("upvotes")
    .withIndex("by_project_and_user", (q) =>
      q.eq("projectId", projectId).eq("userId", userId)
    )
    .first();

  const hasAdoption = await ctx.db
    .query("adoptions")
    .withIndex("by_project_and_user", (q) =>
      q.eq("projectId", projectId).eq("userId", userId)
    )
    .first();

  const hasUserComment = await ctx.db
    .query("comments")
    .withIndex("by_user_project", (q) =>
      q.eq("userId", userId).eq("projectId", projectId)
    )
    .filter((q) => q.neq(q.field("isDeleted"), true))
    .first();

  if (hasUpvote || hasAdoption || hasUserComment) return;

  await ctx.db.patch(affinity._id, {
    engagedProjectIds: affinity.engagedProjectIds.filter((id) => id !== projectId),
  });
}

export async function incrementalToggleFollowedSpace(
  ctx: MutationCtx,
  userId: Id<"users">,
  focusAreaId: Id<"focusAreas">,
  isFollowing: boolean
) {
  const affinity = await ctx.db
    .query("userAffinities")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!affinity) return;

  if (isFollowing) {
    if (!affinity.followedSpaceIds.includes(focusAreaId)) {
      await ctx.db.patch(affinity._id, {
        followedSpaceIds: [...affinity.followedSpaceIds, focusAreaId],
      });
    }
  } else {
    await ctx.db.patch(affinity._id, {
      followedSpaceIds: affinity.followedSpaceIds.filter((id) => id !== focusAreaId),
    });
  }
}
