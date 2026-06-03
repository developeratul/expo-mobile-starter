import { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { isMonthKeyBefore } from '../utils/date_time.js';

/**
 * Incrementally adjusts an account's cleared, uncleared, and working balances.
 * Pass a negative amountCents to reverse a previous adjustment.
 */
export async function adjustAccountBalance(
  ctx: MutationCtx,
  accountId: Id<'accounts'>,
  amountCents: number,
  isCleared: boolean,
) {
  const account = await ctx.db.get(accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);

  await ctx.db.patch(accountId, {
    clearedBalanceCents: account.clearedBalanceCents + (isCleared ? amountCents : 0),
    unclearedBalanceCents: account.unclearedBalanceCents + (isCleared ? 0 : amountCents),
    workingBalanceCents: account.workingBalanceCents + amountCents,
  });
}

/**
 * Adjusts cleared/uncleared split without changing the working balance.
 * Used when a transaction's cleared status is toggled.
 */
export async function adjustAccountClearedSplit(
  ctx: MutationCtx,
  accountId: Id<'accounts'>,
  amountCents: number,
  nowCleared: boolean,
) {
  const account = await ctx.db.get(accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);

  if (nowCleared) {
    await ctx.db.patch(accountId, {
      clearedBalanceCents: account.clearedBalanceCents + amountCents,
      unclearedBalanceCents: account.unclearedBalanceCents - amountCents,
    });
  } else {
    await ctx.db.patch(accountId, {
      clearedBalanceCents: account.clearedBalanceCents - amountCents,
      unclearedBalanceCents: account.unclearedBalanceCents + amountCents,
    });
  }
}

/**
 * Incrementally adjusts a category's activityCents and availableCents for a
 * given month. Creates the monthBudget row with zero values if it doesn't exist.
 * Pass a negative activityDelta to reverse a previous adjustment.
 */
export async function adjustMonthBudget(
  ctx: MutationCtx,
  budgetId: Id<'budgets'>,
  categoryId: Id<'categories'>,
  monthKey: string,
  activityDelta: number,
) {
  const existing = await ctx.db
    .query('monthBudgets')
    .withIndex('by_categoryId_and_monthKey', q =>
      q.eq('categoryId', categoryId).eq('monthKey', monthKey),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      activityCents: existing.activityCents + activityDelta,
      availableCents: existing.availableCents + activityDelta,
    });
  } else {
    await ctx.db.insert('monthBudgets', {
      budgetId,
      categoryId,
      monthKey,
      assignedCents: 0,
      activityCents: activityDelta,
      carryOverCents: 0,
      availableCents: activityDelta,
    });
  }
}

/**
 * When a transaction is created/updated/deleted on a credit card account,
 * the CC Payment category's monthly activity must be adjusted automatically.
 *
 * Spending on the card (negative amountCents) → CC Payment activity increases
 * (auto-funding the payment envelope).
 * The caller passes the raw activityDelta to apply.
 */
export async function adjustCcPaymentActivity(
  ctx: MutationCtx,
  budgetId: Id<'budgets'>,
  ccAccountId: Id<'accounts'>,
  monthKey: string,
  activityDelta: number,
) {
  const ccPaymentCategory = await ctx.db
    .query('categories')
    .withIndex('by_creditCardAccountId', q =>
      q.eq('creditCardAccountId', ccAccountId),
    )
    .unique();

  if (!ccPaymentCategory) return;

  await adjustMonthBudget(ctx, budgetId, ccPaymentCategory._id, monthKey, activityDelta);
}

/**
 * Updates budget.firstMonthKey if the given monthKey is earlier.
 * Called whenever a transaction is created to keep the month navigation bound correct.
 */
export async function updateBudgetFirstMonthIfNeeded(
  ctx: MutationCtx,
  budgetId: Id<'budgets'>,
  monthKey: string,
) {
  const budget = await ctx.db.get(budgetId);
  if (!budget) return;

  if (isMonthKeyBefore(monthKey, budget.firstMonthKey)) {
    await ctx.db.patch(budgetId, { firstMonthKey: monthKey });
  }
}
