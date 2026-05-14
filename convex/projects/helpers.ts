import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const HOT_SCORE_GRAVITY = 1.8;
const HOT_SCORE_AGE_OFFSET = 2;

/**
 * Calculate HN-style hot score for a project
 * Formula: (score + 1) / (age_hours + 2)^gravity
 */
export function calculateHotScore(
  engagementScore: number,
  creationTime: number,
  now: number = Date.now(),
  lastVersionAt?: number
): number {
  const effectiveTime = lastVersionAt ? Math.max(creationTime, lastVersionAt) : creationTime;
  const ageHours = (now - effectiveTime) / (1000 * 60 * 60);
  return (engagementScore + 1) / Math.pow(ageHours + HOT_SCORE_AGE_OFFSET, HOT_SCORE_GRAVITY);
}

export async function enrichProjects(
  ctx: QueryCtx,
  projects: Doc<"projects">[],
  userId: Id<"users"> | undefined
) {
  // Phase 1: per-project queries (can't be deduped across projects)
  const perProject = await Promise.all(
    projects.map(async (project) => {
      const [mediaFiles, topFollows, projectSpaceRows, hasUpvoted, hasFollowed] =
        await Promise.all([
          ctx.db
            .query("mediaFiles")
            .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
            .order("asc")
            .collect(),
          ctx.db
            .query("adoptions")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .order("desc")
            .take(4),
          ctx.db
            .query("projectSpaces")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect(),
          userId
            ? ctx.db
                .query("upvotes")
                .withIndex("by_project_and_user", (q) =>
                  q.eq("projectId", project._id).eq("userId", userId)
                )
                .first()
                .then((u) => u !== null)
            : Promise.resolve(false),
          userId
            ? ctx.db
                .query("adoptions")
                .withIndex("by_project_and_user", (q) =>
                  q.eq("projectId", project._id).eq("userId", userId)
                )
                .first()
                .then((a) => a !== null)
            : Promise.resolve(false),
        ]);
      return {
        project,
        mediaFiles,
        topFollows,
        projectSpaceRows,
        hasUpvoted,
        hasFollowed,
      };
    })
  );

  // Phase 2: batch-fetch unique users, focus areas, teams
  const userIdSet = new Set<Id<"users">>();
  const focusAreaIdSet = new Set<Id<"focusAreas">>();
  const teamIdSet = new Set<Id<"teams">>();
  for (const item of perProject) {
    userIdSet.add(item.project.userId);
    for (const f of item.topFollows) userIdSet.add(f.userId);
    for (const r of item.projectSpaceRows) focusAreaIdSet.add(r.focusAreaId);
    if (item.project.teamId) teamIdSet.add(item.project.teamId);
  }

  const [userEntries, focusAreaEntries, teamEntries] = await Promise.all([
    Promise.all(
      Array.from(userIdSet).map(
        async (id) => [id, await ctx.db.get(id)] as const
      )
    ),
    Promise.all(
      Array.from(focusAreaIdSet).map(
        async (id) => [id, await ctx.db.get(id)] as const
      )
    ),
    Promise.all(
      Array.from(teamIdSet).map(
        async (id) => [id, await ctx.db.get(id)] as const
      )
    ),
  ]);
  const userMap = new Map(userEntries);
  const focusAreaMap = new Map(focusAreaEntries);
  const teamMap = new Map(teamEntries);

  // Phase 3: assemble + resolve media URLs in parallel
  return Promise.all(
    perProject.map(
      async ({
        project,
        mediaFiles,
        topFollows,
        projectSpaceRows,
        hasUpvoted,
        hasFollowed,
      }) => {
        const creator = userMap.get(project.userId) ?? null;
        const team = project.teamId ? teamMap.get(project.teamId) ?? null : null;

        const validSpaces = projectSpaceRows
          .map((row) => {
            const fa = focusAreaMap.get(row.focusAreaId);
            if (!fa || !fa.isActive) return null;
            return {
              isPrimary: row.isPrimary,
              space: { _id: fa._id, name: fa.name, group: fa.group, icon: fa.icon },
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        const primary = validSpaces.find((r) => r.isPrimary)?.space ?? null;
        const secondary = validSpaces.filter((r) => !r.isPrimary).map((r) => r.space);

        const previewMedia = await Promise.all(
          mediaFiles.map(async (media) => ({
            _id: media._id,
            storageId: media.storageId,
            type: media.type,
            url: await ctx.storage.getUrl(media.storageId),
          }))
        );

        const followersWithInfo = topFollows.map((follow) => {
          const user = userMap.get(follow.userId);
          return {
            _id: follow.userId,
            name: user?.name ?? "Unknown User",
            avatarUrl: user?.avatarUrlId ?? "",
          };
        });

        return {
          ...project,
          team: team?.name ?? "",
          upvotes: project.upvoteCount ?? 0,
          viewCount: project.viewCount ?? 0,
          commentCount: project.commentCount ?? 0,
          hasUpvoted,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          focusArea: primary,
          additionalFocusAreas: secondary,
          previewMedia,
          followerCount: project.adoptionCount ?? 0,
          followers: followersWithInfo,
          hasFollowed,
        };
      }
    )
  );
}
