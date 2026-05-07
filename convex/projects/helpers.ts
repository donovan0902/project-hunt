import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getAllSpacesForProject } from "./spaces";

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
  return Promise.all(
    projects.map(async (project) => {
      const [upvotes, comments, creator, team, mediaFiles, follows, spaces] = await Promise.all([
        ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect(),
        ctx.db.get(project.userId),
        project.teamId ? ctx.db.get(project.teamId) : Promise.resolve(null),
        ctx.db
          .query("mediaFiles")
          .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
          .order("asc")
          .collect(),
        ctx.db
          .query("adoptions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .order("desc")
          .collect(),
        getAllSpacesForProject(ctx, project._id),
      ]);

      const previewMedia = await Promise.all(
        mediaFiles.map(async (media) => ({
          _id: media._id,
          storageId: media.storageId,
          type: media.type,
          url: await ctx.storage.getUrl(media.storageId),
        }))
      );

      const followersWithInfo = await Promise.all(
        follows.slice(0, 4).map(async (follow) => {
          const user = await ctx.db.get(follow.userId);
          return {
            _id: follow.userId,
            name: user?.name ?? "Unknown User",
            avatarUrl: user?.avatarUrlId ?? "",
          };
        })
      );

      return {
        ...project,
        team: team?.name ?? "",
        upvotes: upvotes.length,
        viewCount: project.viewCount ?? 0,
        commentCount: comments.length,
        hasUpvoted: userId ? upvotes.some((u) => u.userId === userId) : false,
        creatorName: creator?.name ?? "Unknown User",
        creatorAvatar: creator?.avatarUrlId ?? "",
        focusArea: spaces.primary,
        additionalFocusAreas: spaces.secondary,
        previewMedia,
        followerCount: follows.length,
        followers: followersWithInfo,
        hasFollowed: userId ? follows.some((a) => a.userId === userId) : false,
      };
    })
  );
}
