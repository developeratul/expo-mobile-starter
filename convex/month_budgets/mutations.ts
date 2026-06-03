import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { SYSTEM_CATEGORY_NAMES } from '../lib/constants.js';
import { getPreviousMonthKey } from '../utils/date_time.js';

/**
 * Seeds a month's envelope rows by carrying forward each category's available
 * balance from the previous month as carryOverCents.
 *
 * Safe to call multiple times — idempotent by design. Also corrects rows that
 * were pre-created by transactions landing in the month before it was opened.
 *
 * System categories (RTA, Uncategorized) are excluded — they are computed
 * fresh each month, not rolled over.
 */
export const openMonth = mutation({
  args: {
    budgetId: v.id('budgets'),
    monthKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const prevMonthKey = getPreviousMonthKey(args.monthKey);

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
      .filter(q =>
        q.and(q.eq(q.field('isDeleted'), false), q.eq(q.field('isSystem'), false)),
      )
      .collect();

    await Promise.all(
      categories.map(async category => {
        const [prevRow, currentRow] = await Promise.all([
          ctx.db
            .query('monthBudgets')
            .withIndex('by_categoryId_and_monthKey', q =>
              q.eq('categoryId', category._id).eq('monthKey', prevMonthKey),
            )
            .unique(),
          ctx.db
            .query('monthBudgets')
            .withIndex('by_categoryId_and_monthKey', q =>
              q.eq('categoryId', category._id).eq('monthKey', args.monthKey),
            )
            .unique(),
        ]);

        const carryOverCents = prevRow?.availableCents ?? 0;

        if (currentRow) {
          // Row was pre-created by a transaction before this month was opened.
          // Correct carryOver and recalculate available.
          await ctx.db.patch(currentRow._id, {
            carryOverCents,
            availableCents:
              carryOverCents + currentRow.assignedCents + currentRow.activityCents,
          });
        } else {
          await ctx.db.insert('monthBudgets', {
            budgetId: args.budgetId,
            categoryId: category._id,
            monthKey: args.monthKey,
            assignedCents: 0,
            activityCents: 0,
            carryOverCents,
            availableCents: carryOverCents,
          });
        }
      }),
    );

    return null;
  },
});

/**
 * Sets the assigned amount for a category in a given month.
 * Creates the monthBudget row if it doesn't exist.
 * This is the primary "give money a job" action in the budget view.
 */
export const assign = mutation({
  args: {
    budgetId: v.id('budgets'),
    categoryId: v.id('categories'),
    monthKey: v.string(),
    assignedCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted || category.budgetId !== args.budgetId) {
      throw new ConvexError('Category not found in this budget');
    }
    if (category.isSystem && category.name === SYSTEM_CATEGORY_NAMES.READY_TO_ASSIGN) {
      throw new ConvexError('Cannot manually assign to the Ready to Assign category');
    }

    const existing = await ctx.db
      .query('monthBudgets')
      .withIndex('by_categoryId_and_monthKey', q =>
        q.eq('categoryId', args.categoryId).eq('monthKey', args.monthKey),
      )
      .unique();

    if (existing) {
      const availableCents =
        existing.carryOverCents + args.assignedCents + existing.activityCents;
      await ctx.db.patch(existing._id, { assignedCents: args.assignedCents, availableCents });
    } else {
      await ctx.db.insert('monthBudgets', {
        budgetId: args.budgetId,
        categoryId: args.categoryId,
        monthKey: args.monthKey,
        assignedCents: args.assignedCents,
        activityCents: 0,
        carryOverCents: 0,
        availableCents: args.assignedCents,
      });
    }

    return null;
  },
});

/**
 * Moves money from one category to another in the same month.
 * Reduces the source available and increases the destination available.
 */
export const moveMoney = mutation({
  args: {
    budgetId: v.id('budgets'),
    fromCategoryId: v.id('categories'),
    toCategoryId: v.id('categories'),
    monthKey: v.string(),
    amountCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    if (args.amountCents <= 0) {
      throw new ConvexError('Amount must be positive');
    }

    // Helper: get or create a monthBudget row
    async function getOrCreate(categoryId: typeof args.fromCategoryId) {
      const existing = await ctx.db
        .query('monthBudgets')
        .withIndex('by_categoryId_and_monthKey', q =>
          q.eq('categoryId', categoryId).eq('monthKey', args.monthKey),
        )
        .unique();

      if (existing) return existing;

      const id = await ctx.db.insert('monthBudgets', {
        budgetId: args.budgetId,
        categoryId,
        monthKey: args.monthKey,
        assignedCents: 0,
        activityCents: 0,
        carryOverCents: 0,
        availableCents: 0,
      });
      return (await ctx.db.get(id))!;
    }

    const [fromRow, toRow] = await Promise.all([
      getOrCreate(args.fromCategoryId),
      getOrCreate(args.toCategoryId),
    ]);

    // Move money by adjusting the assigned amounts
    const fromNewAssigned = fromRow.assignedCents - args.amountCents;
    const toNewAssigned = toRow.assignedCents + args.amountCents;

    await ctx.db.patch(fromRow._id, {
      assignedCents: fromNewAssigned,
      availableCents: fromRow.carryOverCents + fromNewAssigned + fromRow.activityCents,
    });

    await ctx.db.patch(toRow._id, {
      assignedCents: toNewAssigned,
      availableCents: toRow.carryOverCents + toNewAssigned + toRow.activityCents,
    });

    return null;
  },
});
