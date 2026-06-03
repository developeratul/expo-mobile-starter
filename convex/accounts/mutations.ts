import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { SYSTEM_CATEGORY_NAMES, SYSTEM_GROUP_NAMES } from '../lib/constants.js';
import { accountType } from '../lib/validators.js';
import { adjustAccountBalance, adjustMonthBudget } from '../transactions/helpers.js';
import { getCurrentMonthKey, getMonthKeyFromDate } from '../utils/date_time.js';

const ON_BUDGET_TYPES = new Set([
  'checking',
  'savings',
  'cash',
  'credit_card',
  'line_of_credit',
]);

export const create = mutation({
  args: {
    budgetId: v.id('budgets'),
    name: v.string(),
    type: accountType,
    currencyCode: v.string(),
    sortOrder: v.number(),
    note: v.optional(v.string()),
    // Debt account metadata
    originalDebtCents: v.optional(v.number()),
    interestRateBasisPoints: v.optional(v.number()),
    minimumPaymentCents: v.optional(v.number()),
    // Opening balance (positive for assets, negative for debts)
    openingBalanceCents: v.optional(v.number()),
    openingBalanceDate: v.optional(v.string()), // "YYYY-MM-DD"
  },
  returns: v.id('accounts'),
  handler: async (ctx, args) => {
    const { user } = await assertBudgetAccess(ctx, args.budgetId, 'editor');
    const onBudget = ON_BUDGET_TYPES.has(args.type);

    const accountId = await ctx.db.insert('accounts', {
      budgetId: args.budgetId,
      name: args.name,
      type: args.type,
      onBudget,
      clearedBalanceCents: 0,
      unclearedBalanceCents: 0,
      workingBalanceCents: 0,
      currencyCode: args.currencyCode,
      note: args.note,
      sortOrder: args.sortOrder,
      originalDebtCents: args.originalDebtCents,
      interestRateBasisPoints: args.interestRateBasisPoints,
      minimumPaymentCents: args.minimumPaymentCents,
      isDeleted: false,
    });

    // Every account gets a transfer payee so it can be the target of transfers
    await ctx.db.insert('payees', {
      budgetId: args.budgetId,
      name: `Transfer: ${args.name}`,
      transferAccountId: accountId,
      isDeleted: false,
    });

    // Credit card accounts get an auto-managed payment category
    if (args.type === 'credit_card') {
      const systemGroups = await ctx.db
        .query('categoryGroups')
        .withIndex('by_budgetId_and_isSystem', q =>
          q.eq('budgetId', args.budgetId).eq('isSystem', true),
        )
        .take(10);

      const ccGroup = systemGroups.find(g => g.name === SYSTEM_GROUP_NAMES.CREDIT_CARD_PAYMENTS);
      if (!ccGroup) throw new ConvexError('Credit Card Payments group not found');

      const existingCategories = await ctx.db
        .query('categories')
        .withIndex('by_budgetId', q => q.eq('budgetId', args.budgetId))
        .take(500);

      const maxSortOrder = existingCategories
        .filter(c => c.groupId === ccGroup._id)
        .reduce((max, c) => Math.max(max, c.sortOrder), -1);

      await ctx.db.insert('categories', {
        budgetId: args.budgetId,
        groupId: ccGroup._id,
        name: args.name,
        isSystem: false,
        creditCardAccountId: accountId,
        sortOrder: maxSortOrder + 1,
        isDeleted: false,
      });
    }

    // Opening balance: create the initial transaction if provided
    const openingBalance = args.openingBalanceCents ?? 0;
    if (openingBalance !== 0) {
      const date = args.openingBalanceDate ?? new Date().toISOString().slice(0, 10);
      const monthKey = getMonthKeyFromDate(date);

      // Find the appropriate system category for the opening balance
      let categoryId = undefined as string | undefined;
      if (onBudget) {
        const systemCategories = await ctx.db
          .query('categories')
          .withIndex('by_budgetId_and_isSystem', q =>
            q.eq('budgetId', args.budgetId).eq('isSystem', true),
          )
          .take(10);

        const rtaCategory = systemCategories.find(
          c => c.name === SYSTEM_CATEGORY_NAMES.READY_TO_ASSIGN,
        );
        const uncategorized = systemCategories.find(
          c => c.name === SYSTEM_CATEGORY_NAMES.UNCATEGORIZED,
        );

        // Positive balance → RTA (income to assign), negative → uncategorized
        categoryId =
          openingBalance > 0 ? rtaCategory?._id : uncategorized?._id;
      }

      await ctx.db.insert('transactions', {
        budgetId: args.budgetId,
        accountId,
        amountCents: openingBalance,
        date,
        monthKey,
        categoryId: categoryId as any,
        memo: 'Opening Balance',
        cleared: true,
        approved: true,
        reconciled: false,
        isSplit: false,
        currencyCode: args.currencyCode,
        isDeleted: false,
        createdBy: user._id,
      });

      await adjustAccountBalance(ctx, accountId, openingBalance, true);

      if (categoryId) {
        await adjustMonthBudget(
          ctx,
          args.budgetId,
          categoryId as any,
          monthKey,
          openingBalance,
        );
      }
    }

    return accountId;
  },
});

export const update = mutation({
  args: {
    accountId: v.id('accounts'),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    interestRateBasisPoints: v.optional(v.number()),
    minimumPaymentCents: v.optional(v.number()),
    institutionName: v.optional(v.string()),
    accountNumberSuffix: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.isDeleted) throw new ConvexError('Account not found');

    await assertBudgetAccess(ctx, account.budgetId, 'editor');

    const { accountId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(accountId, patch);
    }

    return null;
  },
});

export const remove = mutation({
  args: { accountId: v.id('accounts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.isDeleted) throw new ConvexError('Account not found');

    await assertBudgetAccess(ctx, account.budgetId, 'editor');

    await ctx.db.patch(args.accountId, { isDeleted: true, deletedAt: Date.now() });

    // Soft-delete the linked transfer payee
    const transferPayee = await ctx.db
      .query('payees')
      .withIndex('by_transferAccountId', q =>
        q.eq('transferAccountId', args.accountId),
      )
      .unique();

    if (transferPayee) {
      await ctx.db.patch(transferPayee._id, { isDeleted: true, deletedAt: Date.now() });
    }

    // Soft-delete the linked CC payment category if applicable
    if (account.type === 'credit_card') {
      const ccCategory = await ctx.db
        .query('categories')
        .withIndex('by_creditCardAccountId', q =>
          q.eq('creditCardAccountId', args.accountId),
        )
        .unique();

      if (ccCategory) {
        await ctx.db.patch(ccCategory._id, { isDeleted: true, deletedAt: Date.now() });
      }
    }

    return null;
  },
});
