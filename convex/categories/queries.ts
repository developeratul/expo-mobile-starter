import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { goalType, goalRepeatFrequency } from '../lib/validators.js';

const goalShape = v.object({
  type: goalType,
  targetAmountCents: v.number(),
  targetDate: v.optional(v.string()),
  monthlyAmountCents: v.optional(v.number()),
  dayOfMonth: v.optional(v.number()),
  repeatFrequency: v.optional(goalRepeatFrequency),
  linkedAccountId: v.optional(v.id('accounts')),
});

const categoryShape = {
  _id: v.id('categories'),
  _creationTime: v.number(),
  budgetId: v.id('budgets'),
  groupId: v.id('categoryGroups'),
  name: v.string(),
  isSystem: v.boolean(),
  creditCardAccountId: v.optional(v.id('accounts')),
  note: v.optional(v.string()),
  sortOrder: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  goal: v.optional(goalShape),
};

const groupShape = {
  _id: v.id('categoryGroups'),
  _creationTime: v.number(),
  budgetId: v.id('budgets'),
  name: v.string(),
  isSystem: v.boolean(),
  sortOrder: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
};

/**
 * Returns all non-deleted groups with their non-deleted categories nested.
 * Sorted by group sortOrder, then category sortOrder within each group.
 */
export const listWithGroups = query({
  args: { budgetId: v.id('budgets') },
  returns: v.array(
    v.object({
      group: v.object(groupShape),
      categories: v.array(v.object(categoryShape)),
    }),
  ),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');

    const groups = await ctx.db
      .query('categoryGroups')
      .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
      .collect();

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
      .collect();

    const activeGroups = groups
      .filter(g => !g.isDeleted)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const activeCategories = categories.filter(c => !c.isDeleted);

    return activeGroups.map(group => ({
      group,
      categories: activeCategories
        .filter(c => c.groupId === group._id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  },
});
