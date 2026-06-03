import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { assertBudgetAccess, getCurrentUserOrThrow } from '../lib/auth.js';
import { SYSTEM_CATEGORY_NAMES, SYSTEM_GROUP_NAMES } from '../lib/constants.js';
import { getCurrentMonthKey } from '../utils/date_time.js';

export const create = mutation({
  args: {
    name: v.string(),
    currencyCode: v.string(),
    numberFormat: v.union(
      v.literal('comma_dot'),
      v.literal('dot_comma'),
      v.literal('space_dot'),
    ),
    dateFormat: v.string(),
    showCents: v.boolean(),
  },
  returns: v.id('budgets'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    const budgetId = await ctx.db.insert('budgets', {
      name: args.name,
      ownerId: user._id,
      currencyCode: args.currencyCode,
      firstMonthKey: getCurrentMonthKey(),
      numberFormat: args.numberFormat,
      dateFormat: args.dateFormat,
      showCents: args.showCents,
      isDeleted: false,
    });

    // Owner row — required for assertBudgetAccess to pass on all subsequent calls
    await ctx.db.insert('budgetMembers', {
      budgetId,
      userId: user._id,
      role: 'owner',
      invitedAt: now,
      acceptedAt: now,
      isActive: true,
    });

    // System groups — skeleton only, user fills categories during onboarding
    const internalGroupId = await ctx.db.insert('categoryGroups', {
      budgetId,
      name: SYSTEM_GROUP_NAMES.INTERNAL,
      isSystem: true,
      sortOrder: 0,
      isDeleted: false,
    });

    // "Credit Card Payments" group is empty until CC accounts are added
    await ctx.db.insert('categoryGroups', {
      budgetId,
      name: SYSTEM_GROUP_NAMES.CREDIT_CARD_PAYMENTS,
      isSystem: true,
      sortOrder: 1,
      isDeleted: false,
    });

    // These two categories are mandatory — the transaction logic references them
    await ctx.db.insert('categories', {
      budgetId,
      groupId: internalGroupId,
      name: SYSTEM_CATEGORY_NAMES.READY_TO_ASSIGN,
      isSystem: true,
      sortOrder: 0,
      isDeleted: false,
    });

    await ctx.db.insert('categories', {
      budgetId,
      groupId: internalGroupId,
      name: SYSTEM_CATEGORY_NAMES.UNCATEGORIZED,
      isSystem: true,
      sortOrder: 1,
      isDeleted: false,
    });

    return budgetId;
  },
});

export const update = mutation({
  args: {
    budgetId: v.id('budgets'),
    name: v.optional(v.string()),
    numberFormat: v.optional(
      v.union(
        v.literal('comma_dot'),
        v.literal('dot_comma'),
        v.literal('space_dot'),
      ),
    ),
    dateFormat: v.optional(v.string()),
    showCents: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const { budgetId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(budgetId, patch);
    }

    return null;
  },
});

export const remove = mutation({
  args: { budgetId: v.id('budgets') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'owner');

    const hasTransactions = await ctx.db
      .query('transactions')
      .withIndex('by_budgetId_and_date', q => q.eq('budgetId', args.budgetId))
      .take(1);

    if (hasTransactions.length > 0) {
      throw new ConvexError(
        'Cannot change currency after transactions exist. Create a new budget instead.',
      );
    }

    await ctx.db.patch(args.budgetId, { isDeleted: true, deletedAt: Date.now() });
    return null;
  },
});
