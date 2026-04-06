/**
 * Projects API facade — re-exports from convex/projects/* for stable api.projects.* and internal.projects.*
 */
export { calculateHotScore } from "./projects/helpers";

export {
  generateUploadUrl,
  getMediaUrl,
  addFileToProject,
  deleteFileFromProject,
  getProjectFiles,
  addMediaToProject,
  deleteMediaFromProject,
  getProjectMedia,
  reorderProjectMedia,
} from "./projects/media";

export {
  getCurrentUserInternal,
  getProject,
  getProjectsByEntryIds,
  populateProjectDetails,
  createProject,
  updateEntryId,
  deleteProject,
  updateProjectFields,
  confirmProject,
  create,
  updateProject,
  cancelProject,
  backfillProject,
  backfillEngagementScores,
  processDescriptionMentions,
} from "./projects/lifecycle";

export {
  list,
  listPaginated,
  listNewestPaginated,
  getUserProjects,
  getByUserId,
  getFollowedByUser,
  getNewestProjects,
  getTopProjectsBySpace,
  getById,
  getProjectsByEntryIdsPublic,
} from "./projects/listing";

export {
  trackView,
  toggleUpvote,
  toggleFollow,
  hasUserUpvoted,
  getUpvoteCount,
  getFollowers,
  refreshHotScores,
  trackLinkClick,
  getLinkClickCounts,
} from "./projects/engagement";

export {
  fullTextSearchProjects,
  searchCatalog,
  getSimilarProjects,
  searchSimilarProjectsByText,
} from "./projects/search";

export {
  syncProjectSpaceMemberships,
  deleteProjectMemberships,
  propagateHotScoreToMemberships,
  listPaginatedBySpaceMembership,
} from "./projects/spaces";

export {
  migrateReadinessStatusAction,
  migrateReadinessStatus,
  getAllProjectIds,
  reindexProjectInRag,
  reindexAllProjectsInRag,
} from "./projects/migrations";

export {
  listPersonalizedFeed,
} from "./projects/personalizedFeed";

export {
  listByProject as listVersionsByProject,
  getVersionById,
  getVersionFiles,
  createVersion,
  updateVersion,
  deleteVersion,
  addFileToVersion,
  deleteFileFromVersion,
} from "./projects/versions";
