import { MutationCtx, QueryCtx } from "../_generated/server";

export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }

  const user = await userByClerkId(ctx, identity.subject);
  
  // User will be null if webhook hasn't synced yet
  // Let the UI handle this gracefully
  return user;
}

export async function userByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}
