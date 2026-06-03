import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { flagColor } from '../lib/validators.js';
import {
  adjustAccountBalance,
  adjustAccountClearedSplit,
  adjustMonthBudget,
  adjustCcPaymentActivity,
  updateBudgetFirstMonthIfNeeded,
} from './helpers.js';
import { getMonthKeyFromDate } from '../utils/date_time.js';

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    budgetId: v.id('budgets'),
    accountId: v.id('accounts'),
    amountCents: v.number(),
    date: v.string(),
    payeeId: v.optional(v.id('payees')),
    categoryId: v.optional(v.id('categories')),
    memo: v.optional(v.string()),
    cleared: v.boolean(),
    approved: v.boolean(),
    flagColor: v.optional(flagColor),
    // Multi-currency (optional — omit for budget-native transactions)
    originalAmountCents: v.optional(v.number()),
    originalCurrencyCode: v.optional(v.string()),
    exchangeRateMicros: v.optional(v.number()),
  },
  returns: v.id('transactions'),
  handler: async (ctx, args) => {
    const { user } = await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const account = await ctx.db.get(args.accountId);
    if (!account || account.isDeleted || account.budgetId !== args.budgetId) {
      throw new ConvexError('Account not found in this budget');
    }

    const budget = await ctx.db.get(args.budgetId);
    if (!budget) throw new ConvexError('Budget not found');

    const monthKey = getMonthKeyFromDate(args.date);

    const txId = await ctx.db.insert('transactions', {
      budgetId: args.budgetId,
      accountId: args.accountId,
      amountCents: args.amountCents,
      date: args.date,
      monthKey,
      payeeId: args.payeeId,
      categoryId: args.categoryId,
      memo: args.memo,
      cleared: args.cleared,
      approved: args.approved,
      reconciled: false,
      isSplit: false,
      flagColor: args.flagColor,
      currencyCode: budget.currencyCode,
      originalAmountCents: args.originalAmountCents,
      originalCurrencyCode: args.originalCurrencyCode,
      exchangeRateMicros: args.exchangeRateMicros,
      isDeleted: false,
      createdBy: user._id,
    });

    await adjustAccountBalance(ctx, args.accountId, args.amountCents, args.cleared);

    if (args.categoryId) {
      await adjustMonthBudget(
        ctx,
        args.budgetId,
        args.categoryId,
        monthKey,
        args.amountCents,
      );
    }

    // CC auto-fund: spending on a CC envelope automatically sets aside the same
    // amount in the CC Payment category so the user always has money to pay the bill
    if (account.type === 'credit_card' && args.categoryId && args.amountCents < 0) {
      await adjustCcPaymentActivity(
        ctx,
        args.budgetId,
        args.accountId,
        monthKey,
        Math.abs(args.amountCents),
      );
    }

    await updateBudgetFirstMonthIfNeeded(ctx, args.budgetId, monthKey);

    return txId;
  },
});

// ─── CREATE TRANSFER ──────────────────────────────────────────────────────────

export const createTransfer = mutation({
  args: {
    budgetId: v.id('budgets'),
    fromAccountId: v.id('accounts'),
    toAccountId: v.id('accounts'),
    amountCents: v.number(), // always positive — direction is implicit
    date: v.string(),
    memo: v.optional(v.string()),
    cleared: v.boolean(),
  },
  returns: v.object({
    outflowId: v.id('transactions'),
    inflowId: v.id('transactions'),
  }),
  handler: async (ctx, args) => {
    const { user } = await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const [fromAccount, toAccount, budget] = await Promise.all([
      ctx.db.get(args.fromAccountId),
      ctx.db.get(args.toAccountId),
      ctx.db.get(args.budgetId),
    ]);

    if (!fromAccount || fromAccount.isDeleted || fromAccount.budgetId !== args.budgetId) {
      throw new ConvexError('Source account not found in this budget');
    }
    if (!toAccount || toAccount.isDeleted || toAccount.budgetId !== args.budgetId) {
      throw new ConvexError('Destination account not found in this budget');
    }
    if (!budget) throw new ConvexError('Budget not found');

    const monthKey = getMonthKeyFromDate(args.date);
    const base = {
      budgetId: args.budgetId,
      date: args.date,
      monthKey,
      memo: args.memo,
      cleared: args.cleared,
      approved: true,
      reconciled: false,
      isSplit: false,
      currencyCode: budget.currencyCode,
      isDeleted: false,
      createdBy: user._id,
    };

    // Insert the outflow first (no link yet — inflow ID not known)
    const outflowId = await ctx.db.insert('transactions', {
      ...base,
      accountId: args.fromAccountId,
      amountCents: -args.amountCents,
    });

    // Insert the inflow with a back-link
    const inflowId = await ctx.db.insert('transactions', {
      ...base,
      accountId: args.toAccountId,
      amountCents: args.amountCents,
      transferTransactionId: outflowId,
    });

    // Complete the bidirectional link
    await ctx.db.patch(outflowId, { transferTransactionId: inflowId });

    await adjustAccountBalance(ctx, args.fromAccountId, -args.amountCents, args.cleared);
    await adjustAccountBalance(ctx, args.toAccountId, args.amountCents, args.cleared);

    // CC payment: when money flows INTO a CC account, reduce the CC Payment
    // category available (the payment "uses" the funds set aside)
    if (toAccount.type === 'credit_card') {
      await adjustCcPaymentActivity(
        ctx,
        args.budgetId,
        args.toAccountId,
        monthKey,
        -args.amountCents,
      );
    }

    await updateBudgetFirstMonthIfNeeded(ctx, args.budgetId, monthKey);

    return { outflowId, inflowId };
  },
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    transactionId: v.id('transactions'),
    amountCents: v.optional(v.number()),
    date: v.optional(v.string()),
    payeeId: v.optional(v.id('payees')),
    categoryId: v.optional(v.id('categories')),
    memo: v.optional(v.string()),
    cleared: v.optional(v.boolean()),
    approved: v.optional(v.boolean()),
    flagColor: v.optional(flagColor),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const old = await ctx.db.get(args.transactionId);
    if (!old || old.isDeleted) throw new ConvexError('Transaction not found');
    if (old.reconciled) throw new ConvexError('Cannot edit a reconciled transaction');

    await assertBudgetAccess(ctx, old.budgetId, 'editor');

    const account = await ctx.db.get(old.accountId);
    if (!account) throw new ConvexError('Account not found');

    // Resolve what the new values will be
    const newAmountCents = args.amountCents ?? old.amountCents;
    const newDate = args.date ?? old.date;
    const newMonthKey = getMonthKeyFromDate(newDate);
    const newCategoryId = 'categoryId' in args ? args.categoryId : old.categoryId;
    const newCleared = args.cleared ?? old.cleared;

    // ── Reverse old effects ──────────────────────────────────────────────────
    await adjustAccountBalance(ctx, old.accountId, -old.amountCents, old.cleared);

    if (old.categoryId) {
      await adjustMonthBudget(
        ctx,
        old.budgetId,
        old.categoryId,
        old.monthKey,
        -old.amountCents,
      );
    }

    if (account.type === 'credit_card' && old.categoryId && old.amountCents < 0) {
      await adjustCcPaymentActivity(
        ctx,
        old.budgetId,
        old.accountId,
        old.monthKey,
        -Math.abs(old.amountCents),
      );
    }

    // ── Patch the transaction ────────────────────────────────────────────────
    const patch: Record<string, unknown> = {};
    if (args.amountCents !== undefined) patch.amountCents = args.amountCents;
    if (args.date !== undefined) { patch.date = args.date; patch.monthKey = newMonthKey; }
    if ('payeeId' in args) patch.payeeId = args.payeeId;
    if ('categoryId' in args) patch.categoryId = args.categoryId;
    if (args.memo !== undefined) patch.memo = args.memo;
    if (args.cleared !== undefined) patch.cleared = args.cleared;
    if (args.approved !== undefined) patch.approved = args.approved;
    if ('flagColor' in args) patch.flagColor = args.flagColor;

    await ctx.db.patch(args.transactionId, patch);

    // ── Apply new effects ────────────────────────────────────────────────────
    await adjustAccountBalance(ctx, old.accountId, newAmountCents, newCleared);

    if (newCategoryId) {
      await adjustMonthBudget(
        ctx,
        old.budgetId,
        newCategoryId,
        newMonthKey,
        newAmountCents,
      );
    }

    if (account.type === 'credit_card' && newCategoryId && newAmountCents < 0) {
      await adjustCcPaymentActivity(
        ctx,
        old.budgetId,
        old.accountId,
        newMonthKey,
        Math.abs(newAmountCents),
      );
    }

    await updateBudgetFirstMonthIfNeeded(ctx, old.budgetId, newMonthKey);

    return null;
  },
});

// ─── TOGGLE CLEARED ───────────────────────────────────────────────────────────

export const toggleCleared = mutation({
  args: { transactionId: v.id('transactions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx || tx.isDeleted) throw new ConvexError('Transaction not found');
    if (tx.reconciled) throw new ConvexError('Cannot modify a reconciled transaction');

    await assertBudgetAccess(ctx, tx.budgetId, 'editor');

    const nowCleared = !tx.cleared;
    await ctx.db.patch(args.transactionId, { cleared: nowCleared });
    await adjustAccountClearedSplit(ctx, tx.accountId, tx.amountCents, nowCleared);

    return null;
  },
});

// ─── APPROVE ─────────────────────────────────────────────────────────────────

export const approve = mutation({
  args: { transactionId: v.id('transactions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx || tx.isDeleted) throw new ConvexError('Transaction not found');

    await assertBudgetAccess(ctx, tx.budgetId, 'editor');
    await ctx.db.patch(args.transactionId, { approved: true });
    return null;
  },
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = mutation({
  args: { transactionId: v.id('transactions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx || tx.isDeleted) throw new ConvexError('Transaction not found');
    if (tx.reconciled) throw new ConvexError('Cannot delete a reconciled transaction');

    await assertBudgetAccess(ctx, tx.budgetId, 'editor');

    const account = await ctx.db.get(tx.accountId);
    if (!account) throw new ConvexError('Account not found');

    await ctx.db.patch(args.transactionId, { isDeleted: true, deletedAt: Date.now() });

    await adjustAccountBalance(ctx, tx.accountId, -tx.amountCents, tx.cleared);

    if (tx.categoryId) {
      await adjustMonthBudget(ctx, tx.budgetId, tx.categoryId, tx.monthKey, -tx.amountCents);
    }

    if (account.type === 'credit_card' && tx.categoryId && tx.amountCents < 0) {
      await adjustCcPaymentActivity(
        ctx,
        tx.budgetId,
        tx.accountId,
        tx.monthKey,
        -Math.abs(tx.amountCents),
      );
    }

    // If it's one side of a transfer, soft-delete the other side too
    if (tx.transferTransactionId) {
      const other = await ctx.db.get(tx.transferTransactionId);
      if (other && !other.isDeleted) {
        await ctx.db.patch(tx.transferTransactionId, {
          isDeleted: true,
          deletedAt: Date.now(),
        });

        const otherAccount = await ctx.db.get(other.accountId);
        if (otherAccount) {
          await adjustAccountBalance(ctx, other.accountId, -other.amountCents, other.cleared);

          if (otherAccount.type === 'credit_card' && other.amountCents > 0) {
            // Reversing a CC payment: restore the CC Payment category available
            await adjustCcPaymentActivity(
              ctx,
              tx.budgetId,
              other.accountId,
              other.monthKey,
              other.amountCents,
            );
          }
        }
      }
    }

    return null;
  },
});
