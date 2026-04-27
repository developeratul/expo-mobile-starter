import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    hasCompletedOnboarding: v.boolean(),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_email', ['email']),
});
