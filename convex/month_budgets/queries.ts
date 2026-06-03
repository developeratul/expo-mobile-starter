import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { SYSTEM_CATEGORY_NAMES } from '../lib/constants.js';
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

const monthBudgetRowShape = v.object({
  monthBudgetId: v.optional(v.id('monthBudgets')),
  categoryId: v.id('categories'),
  categoryName: v.string(),
  isSystem: v.boolean(),
  creditCardAccountId: v.optional(v.id('accounts')),
  sortOrder: v.number(),
  goal: v.optional(goalShape),
  monthKey: v.string(),
  assignedCents: v.number(),
  activityCents: v.number(),
  carryOverCents: v.number(),
  availableCents: v.number(),
});

/**
 * Returns all non-deleted category groups with their month budget data for the
 * given month. Categories without a monthBudget row are returned with zeroed
 * amounts — this is the normal state for untouched envelopes.
 *
 * This is the primary data source for the monthly budget view screen.
 */
export const forMonth = query({
  args: {
    budgetId: v.id('budgets'),
    monthKey: v.string(),
  },
  returns: v.array(
    v.object({
      groupId: v.id('categoryGroups'),
      groupName: v.string(),
      isSystem: v.boolean(),
      sortOrder: v.number(),
      rows: v.array(monthBudgetRowShape),
    }),
  ),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');

    const [groups, categories, monthBudgets] = await Promise.all([
      ctx.db
        .query('categoryGroups')
        .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
        .collect(),
      ctx.db
        .query('categories')
        .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
        .collect(),
      ctx.db
        .query('monthBudgets')
        .withIndex('by_budgetId_and_monthKey', q =>
          q.eq('budgetId', args.budgetId).eq('monthKey', args.monthKey),
        )
        .collect(),
    ]);

    // Index monthBudgets by categoryId for O(1) lookup
    const mbByCategoryId = new Map(monthBudgets.map(mb => [mb.categoryId, mb]));

    const activeGroups = groups
      .filter(g => !g.isDeleted)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const activeCategories = categories.filter(c => !c.isDeleted);

    return activeGroups.map(group => {
      const groupCategories = activeCategories
        .filter(c => c.groupId === group._id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const rows = groupCategories.map(cat => {
        const mb = mbByCategoryId.get(cat._id);
        return {
          monthBudgetId: mb?._id,
          categoryId: cat._id,
          categoryName: cat.name,
          isSystem: cat.isSystem,
          creditCardAccountId: cat.creditCardAccountId,
          sortOrder: cat.sortOrder,
          goal: cat.goal,
          monthKey: args.monthKey,
          assignedCents: mb?.assignedCents ?? 0,
          activityCents: mb?.activityCents ?? 0,
          carryOverCents: mb?.carryOverCents ?? 0,
          availableCents: mb?.availableCents ?? 0,
        };
      });

      return {
        groupId: group._id,
        groupName: group.name,
        isSystem: group.isSystem,
        sortOrder: group.sortOrder,
        rows,
      };
    });
  },
});

/**
 * Returns the Ready to Assign amount for a given month.
 *
 * Formula:
 *   RTA = rtaCarryOver + totalInflows - totalAssigned (all non-RTA categories)
 *
 * - rtaCarryOver: unassigned money carried forward from previous month
 * - totalInflows: all income deposited to "Inflow: Ready to Assign" this month
 * - totalAssigned: sum of assignedCents for every non-RTA category this month
 *
 * A negative result means the user has over-assigned (assigned more than available).
 */
export const readyToAssign = query({
  args: {
    budgetId: v.id('budgets'),
    monthKey: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');

    // Find the "Inflow: Ready to Assign" system category
    const systemCategories = await ctx.db
      .query('categories')
      .withIndex('by_budgetId_and_isSystem', q =>
        q.eq('budgetId', args.budgetId).eq('isSystem', true),
      )
      .take(10);

    const rtaCategory = systemCategories.find(
      c => c.name === SYSTEM_CATEGORY_NAMES.READY_TO_ASSIGN,
    );

    if (!rtaCategory) return 0;

    const [rtaMonthBudget, allMonthBudgets] = await Promise.all([
      ctx.db
        .query('monthBudgets')
        .withIndex('by_categoryId_and_monthKey', q =>
          q.eq('categoryId', rtaCategory._id).eq('monthKey', args.monthKey),
        )
        .unique(),
      ctx.db
        .query('monthBudgets')
        .withIndex('by_budgetId_and_monthKey', q =>
          q.eq('budgetId', args.budgetId).eq('monthKey', args.monthKey),
        )
        .collect(),
    ]);

    const rtaCarryOver = rtaMonthBudget?.carryOverCents ?? 0;
    const totalInflows = rtaMonthBudget?.activityCents ?? 0;

    const totalAssigned = allMonthBudgets
      .filter(mb => mb.categoryId !== rtaCategory._id)
      .reduce((sum, mb) => sum + mb.assignedCents, 0);

    return rtaCarryOver + totalInflows - totalAssigned;
  },
});
