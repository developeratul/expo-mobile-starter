import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "./helpers.js";

/**
 * Get the current authenticated user
 */
export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      clerkId: v.string(),
      displayName: v.string(),
      email: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      hasCompletedOnboarding: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
