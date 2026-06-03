import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { accountType } from '../lib/validators.js';

const accountShape = {
  _id: v.id('accounts'),
  _creationTime: v.number(),
  budgetId: v.id('budgets'),
  name: v.string(),
  type: accountType,
  onBudget: v.boolean(),
  clearedBalanceCents: v.number(),
  unclearedBalanceCents: v.number(),
  workingBalanceCents: v.number(),
  currencyCode: v.string(),
  sortOrder: v.number(),
  isDeleted: v.boolean(),
  note: v.optional(v.string()),
  originalDebtCents: v.optional(v.number()),
  interestRateBasisPoints: v.optional(v.number()),
  minimumPaymentCents: v.optional(v.number()),
  lastReconciledAt: v.optional(v.number()),
  lastReconciledBalanceCents: v.optional(v.number()),
  institutionName: v.optional(v.string()),
  accountNumberSuffix: v.optional(v.string()),
  deletedAt: v.optional(v.number()),
};

export const list = query({
  args: { budgetId: v.id('budgets') },
  returns: v.object({
    onBudget: v.array(v.object(accountShape)),
    offBudget: v.array(v.object(accountShape)),
  }),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'viewer');

    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_budgetId_and_isDeleted', q =>
        q.eq('budgetId', args.budgetId).eq('isDeleted', false),
      )
      .collect();

    const sorted = accounts.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      onBudget: sorted.filter(a => a.onBudget),
      offBudget: sorted.filter(a => !a.onBudget),
    };
  },
});

export const get = query({
  args: { accountId: v.id('accounts') },
  returns: v.union(v.object(accountShape), v.null()),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.isDeleted) return null;

    await assertBudgetAccess(ctx, account.budgetId, 'viewer');
    return account;
  },
});
