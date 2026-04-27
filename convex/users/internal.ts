import type { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";
import { internalMutation } from "../_generated/server";
import { userByClerkId } from "./helpers.js";

/**
 * Upsert a user from Clerk webhook data
 */
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const displayName = data.first_name && data.last_name
      ? `${data.first_name} ${data.last_name}`.trim()
      : data.first_name || data.last_name || data.username || data.email_addresses?.[0]?.email_address || "User";

    const userAttributes = {
      clerkId: data.id,
      displayName,
      email: data.email_addresses?.[0]?.email_address,
      avatarUrl: data.image_url,
    };

    const user = await userByClerkId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", {
        ...userAttributes,
        hasCompletedOnboarding: false,
      });
    } else {
      await ctx.db.patch(user._id, {
        displayName: userAttributes.displayName,
        email: userAttributes.email,
        avatarUrl: userAttributes.avatarUrl,
      });
    }
    return null;
  },
});

/**
 * Delete a user from Clerk webhook data
 */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    const user = await userByClerkId(ctx, clerkUserId);
    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
    return null;
  },
});
