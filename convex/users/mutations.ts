import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserOrThrow, userByClerkId } from "./helpers.js";

function displayNameFromIdentity(identity: {
  name?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  email?: string;
}) {
  const combined = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    identity.name?.trim() ||
    combined ||
    identity.nickname?.trim() ||
    identity.email ||
    "User"
  );
}

/**
 * Store the current user from the JWT (official Convex + Clerk pattern).
 * @see https://docs.convex.dev/auth/database-auth#mutation-for-storing-current-user
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication present");
    }

    const displayName = displayNameFromIdentity(identity);
    const email = identity.email ?? undefined;
    const avatarUrl = identity.pictureUrl ?? undefined;

    const existing = await userByClerkId(ctx, identity.subject);
    if (existing !== null) {
      if (
        existing.displayName !== displayName ||
        existing.email !== email ||
        existing.avatarUrl !== avatarUrl
      ) {
        await ctx.db.patch(existing._id, {
          displayName,
          email,
          avatarUrl,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      displayName,
      email,
      avatarUrl,
      hasCompletedOnboarding: false,
    });
  },
});

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
