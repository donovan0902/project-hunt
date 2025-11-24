import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    summary: v.string(),
    teamId: v.optional(v.id("teams")),
    upvotes: v.number(),
    entryId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.string(),
    headline: v.optional(v.string()),
    allFields: v.optional(v.string()),
    link: v.optional(v.string()),
  })
    .searchIndex("allFields", { searchField: "allFields" })
    .index("by_entryId", ["entryId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"]),
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
  upvotes: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"]),
  comments: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    upvotes: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentCommentId"]),
  commentUpvotes: defineTable({
    commentId: v.id("comments"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_and_user", ["commentId", "userId"])
    .index("by_user", ["userId"]),
  users: defineTable({
    name: v.string(),
    externalId: v.string(),
    avatarUrlId: v.string(),
    email: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
  })
    .index("byExternalId", ["externalId"])
    .index("by_teamId", ["teamId"]),
  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
