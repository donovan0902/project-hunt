import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    summary: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    viewCount: v.optional(v.number()),
    entryId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.id("users"),
    allFields: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    readinessStatus: v.optional(v.union(
      v.literal("in_progress"),       // legacy — kept for migration compatibility
      v.literal("just_an_idea"),
      v.literal("early_prototype"),
      v.literal("mostly_working"),
      v.literal("ready_to_use"),
    )),
    pinned: v.optional(v.boolean()),
    engagementScore: v.optional(v.number()),
    hotScore: v.optional(v.number()),
    versionCount: v.optional(v.number()),
    lastVersionAt: v.optional(v.number()),
  })
    .searchIndex("allFields", { searchField: "allFields" })
    .index("by_entryId", ["entryId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_status_engagement", ["status", "engagementScore"])
    .index("by_status_hotScore", ["status", "hotScore"]),
  mediaFiles: defineTable({
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.string(),
    contentType: v.string(),
    order: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_ordered", ["projectId", "order"]),
  projectFiles: defineTable({
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_project", ["projectId"]),
  upvotes: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"])
    .index("by_userId", ["userId"]),
  adoptions: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"])
    .index("by_user", ["userId"]),
  projectViews: defineTable({
    projectId: v.id("projects"),
    viewerId: v.string(),
    viewedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_viewer", ["projectId", "viewerId"]),
  linkClickCounts: defineTable({
    projectId: v.id("projects"),
    resourceId: v.string(),
    resourceType: v.union(v.literal("link"), v.literal("file")),
    count: v.number(),
    lastClickedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_resource", ["projectId", "resourceId"]),
  comments: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
    upvotes: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_user", ["userId"]),
  commentUpvotes: defineTable({
    commentId: v.id("comments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_and_user", ["commentId", "userId"])
    .index("by_user", ["userId"]),
  notifications: defineTable({
    recipientUserId: v.id("users"),
    actorUserId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    threadId: v.optional(v.id("threads")),
    threadCommentId: v.optional(v.id("threadComments")),
    type: v.union(
      v.literal("comment"),
      v.literal("reply"),
      v.literal("upvote"),
      v.literal("adoption"),    // legacy — kept for migration compatibility
      v.literal("follow"),
      v.literal("project_update"),
      v.literal("followed_project_comment"),
      v.literal("mention"),
    ),
    commentId: v.optional(v.id("comments")),
    count: v.optional(v.number()),
    isRead: v.boolean(),
    createdAt: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_recipient", ["recipientUserId"])
    .index("by_recipient_and_read", ["recipientUserId", "isRead"])
    .index("by_recipient_last_activity", ["recipientUserId", "lastActivityAt"])
    .index("by_recipient_project_type", ["recipientUserId", "projectId", "type"])
    .index("by_recipient_thread_type", ["recipientUserId", "threadId", "type"]),
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    emailLower: v.optional(v.string()),
    avatarUrlId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    externalUserId: v.optional(v.string()),
    workosUserId: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    department: v.optional(v.string()),
    userIntent: v.optional(v.union(v.literal("looking"), v.literal("sharing"), v.literal("both"))),
    emailPreferences: v.optional(v.object({
      weeklyDigest: v.optional(v.boolean()),
      spaceActivity: v.optional(v.boolean()),
      projectActivity: v.optional(v.boolean()),
      followedProjectComment: v.optional(v.boolean()),
      followedProjectUpdate: v.optional(v.boolean()),
      mentions: v.optional(v.boolean()),
    })),
  })
    .searchIndex("search_name", { searchField: "name" })
    .index("by_teamId", ["teamId"])
    .index("by_userIntent", ["userIntent"])
    .index("by_externalUserId", ["externalUserId"])
    .index("by_email", ["email"])
    .index("by_email_lower", ["emailLower"])
    .index("by_department", ["department"]),
  userFocusAreas: defineTable({
    userId: v.id("users"),
    focusAreaId: v.id("focusAreas"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_focus_area", ["focusAreaId"])
    .index("by_user_and_focus", ["userId", "focusAreaId"]),
  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }),
  focusAreas: defineTable({
    name: v.string(),
    group: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_group", ["group"]),
  threads: defineTable({
    title: v.string(),
    body: v.optional(v.string()),
    userId: v.id("users"),
    focusAreaId: v.id("focusAreas"),
    upvoteCount: v.number(),
    commentCount: v.number(),
    engagementScore: v.optional(v.number()),
    hotScore: v.optional(v.number()),
    createdAt: v.number(),
    entryId: v.optional(v.string()),
    allFields: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  })
    .searchIndex("allFields", { searchField: "allFields" })
    .index("by_focusArea", ["focusAreaId"])
    .index("by_focusArea_hotScore", ["focusAreaId", "hotScore"])
    .index("by_hotScore", ["hotScore"])
    .index("by_userId", ["userId"])
    .index("by_entryId", ["entryId"]),
  threadUpvotes: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_and_user", ["threadId", "userId"]),
  threadComments: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("threadComments")),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
    upvotes: v.optional(v.number()),
  })
    .index("by_thread", ["threadId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_user", ["userId"]),
  threadCommentUpvotes: defineTable({
    commentId: v.id("threadComments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_and_user", ["commentId", "userId"]),
  emailQueue: defineTable({
    userId: v.id("users"),
    type: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    payload: v.any(),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_userId_type_createdAt", ["userId", "type", "createdAt"]),
  projectVersions: defineTable({
    projectId: v.id("projects"),
    tag: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_createdAt", ["projectId", "createdAt"]),
  projectSpaces: defineTable({
    projectId: v.id("projects"),
    focusAreaId: v.id("focusAreas"),
    isPrimary: v.boolean(),
    hotScore: v.number(),
  })
    .index("by_focusArea", ["focusAreaId"])
    .index("by_focusArea_hotScore", ["focusAreaId", "hotScore"])
    .index("by_project", ["projectId"])
    .index("by_project_focusArea", ["projectId", "focusAreaId"]),
  versionFiles: defineTable({
    versionId: v.id("projectVersions"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_version", ["versionId"]),
  userAffinities: defineTable({
    userId: v.id("users"),
    followedSpaceIds: v.array(v.id("focusAreas")),
    engagedCreatorIds: v.array(v.id("users")),
    engagedProjectIds: v.array(v.id("projects")),
    department: v.optional(v.string()),
    spaceLastEngagedAt: v.optional(v.record(v.string(), v.number())),
    creatorLastEngagedAt: v.optional(v.record(v.string(), v.number())),
    lastRecomputedAt: v.number(),
  })
    .index("by_userId", ["userId"]),
  userFeedEntries: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    personalizedScore: v.number(),
    computedAt: v.number(),
  })
    .index("by_userId_personalizedScore", ["userId", "personalizedScore"])
    .index("by_userId_projectId", ["userId", "projectId"]),
});
