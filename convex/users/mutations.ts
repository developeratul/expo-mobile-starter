import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserOrThrow } from "./helpers.js";

/**
 * Update the display name for the current user
 */
export const updateDisplayName = mutation({
  args: { displayName: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, { displayName: args.displayName });
    return user._id;
  },
});

/**
 * Mark onboarding as complete for the current user
 */
export const completeOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, { hasCompletedOnboarding: true });
    return null;
  },
});
