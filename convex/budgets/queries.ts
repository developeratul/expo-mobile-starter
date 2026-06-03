import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertBudgetAccess, getCurrentUserOrThrow } from '../lib/auth.js';
import { budgetMemberRole } from '../lib/validators.js';

const budgetShape = {
  _id: v.id('budgets'),
  _creationTime: v.number(),
  name: v.string(),
  ownerId: v.id('users'),
  currencyCode: v.string(),
  firstMonthKey: v.string(),
  numberFormat: v.union(
    v.literal('comma_dot'),
    v.literal('dot_comma'),
    v.literal('space_dot'),
  ),
  dateFormat: v.string(),
  showCents: v.boolean(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
};

export const list = query({
  args: {},
  returns: v.array(v.object({ ...budgetShape, role: budgetMemberRole })),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const memberships = await ctx.db
      .query('budgetMembers')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .take(50);

    const results = await Promise.all(
      memberships
        .filter(m => m.isActive)
        .map(async m => {
          const budget = await ctx.db.get(m.budgetId);
          if (!budget || budget.isDeleted) return null;
          return { ...budget, role: m.role };
        }),
    );

    return results.filter((b): b is NonNullable<typeof b> => b !== null);
  },
});

export const get = query({
  args: { budgetId: v.id('budgets') },
  returns: v.union(v.object(budgetShape), v.null()),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.isDeleted) return null;
    return budget;
  },
});
