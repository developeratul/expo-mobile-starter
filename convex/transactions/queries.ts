import { v } from 'convex/values';
import { query } from '../_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { flagColor } from '../lib/validators.js';

const transactionShape = {
  _id: v.id('transactions'),
  _creationTime: v.number(),
  budgetId: v.id('budgets'),
  accountId: v.id('accounts'),
  amountCents: v.number(),
  date: v.string(),
  monthKey: v.string(),
  payeeId: v.optional(v.id('payees')),
  categoryId: v.optional(v.id('categories')),
  memo: v.optional(v.string()),
  cleared: v.boolean(),
  approved: v.boolean(),
  reconciled: v.boolean(),
  isSplit: v.boolean(),
  transferTransactionId: v.optional(v.id('transactions')),
  parentTransactionId: v.optional(v.id('transactions')),
  scheduledTransactionId: v.optional(v.id('scheduledTransactions')),
  flagColor: v.optional(flagColor),
  currencyCode: v.string(),
  originalAmountCents: v.optional(v.number()),
  originalCurrencyCode: v.optional(v.string()),
  exchangeRateMicros: v.optional(v.number()),
  importId: v.optional(v.string()),
  importPayeeName: v.optional(v.string()),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdBy: v.id('users'),
  updatedBy: v.optional(v.id('users')),
};

/**
 * Paginated account register — all non-deleted transactions for an account,
 * newest first. The primary query for the account detail screen.
 */
export const listByAccount = query({
  args: {
    accountId: v.id('accounts'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.isDeleted) return { page: [], isDone: true, continueCursor: '' };

    await assertBudgetAccess(ctx, account.budgetId, 'viewer');

    return await ctx.db
      .query('transactions')
      .withIndex('by_accountId_and_date', q => q.eq('accountId', args.accountId))
      .order('desc')
      .filter(q => q.eq(q.field('isDeleted'), false))
      .paginate(args.paginationOpts);
  },
});

/**
 * Paginated transaction list for a given budget month.
 * Used for the monthly activity view and reports.
 */
export const listByMonth = query({
  args: {
    budgetId: v.id('budgets'),
    monthKey: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');

    return await ctx.db
      .query('transactions')
      .withIndex('by_budgetId_and_monthKey', q =>
        q.eq('budgetId', args.budgetId).eq('monthKey', args.monthKey),
      )
      .order('desc')
      .filter(q => q.eq(q.field('isDeleted'), false))
      .paginate(args.paginationOpts);
  },
});

/**
 * Returns all non-deleted split children for a parent transaction.
 */
export const listSplitChildren = query({
  args: { parentTransactionId: v.id('transactions') },
  returns: v.array(v.object(transactionShape)),
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentTransactionId);
    if (!parent || parent.isDeleted) return [];

    await assertBudgetAccess(ctx, parent.budgetId, 'viewer');

    const children = await ctx.db
      .query('transactions')
      .withIndex('by_parentTransactionId', q =>
        q.eq('parentTransactionId', args.parentTransactionId),
      )
      .collect();

    return children.filter(t => !t.isDeleted);
  },
});
