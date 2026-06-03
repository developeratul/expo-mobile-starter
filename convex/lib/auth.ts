import { ConvexError } from 'convex/values';
import { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

const ROLE_HIERARCHY = { viewer: 0, editor: 1, owner: 2 } as const;
type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Validates that the requesting user is an active member of the given budget
 * with at least the required role. Throws ConvexError on any failure.
 * Must be called at the top of every budget-scoped query and mutation.
 */
export async function assertBudgetAccess(
  ctx: QueryCtx | MutationCtx,
  budgetId: Id<'budgets'>,
  requiredRole: Role = 'viewer',
) {
  const user = await getCurrentUserOrThrow(ctx);

  const membership = await ctx.db
    .query('budgetMembers')
    .withIndex('by_budgetId_and_userId', q =>
      q.eq('budgetId', budgetId).eq('userId', user._id),
    )
    .unique();

  if (!membership?.isActive) {
    throw new ConvexError('Access denied');
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new ConvexError('Insufficient permissions');
  }

  return { user, membership };
}

/**
 * Returns the current authenticated user record, throwing if not found.
 */
export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', q => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new ConvexError('User not found');

  return user;
}
