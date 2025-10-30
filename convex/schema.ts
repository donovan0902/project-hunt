import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    summary: v.string(),
    team: v.string(),
    lead: v.string(),
    leadInitials: v.string(),
    upvotes: v.number(),
    entryId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.string(),
  }),
  upvotes: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"]),
});

