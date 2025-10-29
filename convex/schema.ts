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
  }),
});

