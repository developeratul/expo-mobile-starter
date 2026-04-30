import { v } from 'convex/values';
import { internalQuery, query } from '../_generated/server';
import { getCurrentUserOrThrow } from '../users/helpers.js';
import { addDaysToLocalDate, localDateToUtcTimestamp } from '../utils/date_time.js';
import {
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_THREAD_HISTORY_LIMIT,
  MAX_CHAT_QUERY_LIMIT,
  SPENDING_SUMMARY_LIMIT,
} from './constants.js';
import {
  getActiveExpenseDraft,
  getOwnedThread,
  getOwnedThreadOrThrow,
  listRecentMessages,
} from './helpers.js';
import {
  chatMessageIntent,
  chatMessageRole,
  expenseDraftMissingField,
  threadStatus,
} from './validators.js';

const chatThreadValidator = v.object({
  _id: v.id('chatThreads'),
  _creationTime: v.number(),
  userId: v.id('users'),
  title: v.optional(v.string()),
  status: threadStatus,
  contextSummary: v.optional(v.string()),
  contextSummaryUpdatedAt: v.optional(v.number()),
  lastMessageAt: v.optional(v.number()),
});

const chatMessageValidator = v.object({
  _id: v.id('chatMessages'),
  _creationTime: v.number(),
  threadId: v.id('chatThreads'),
  userId: v.id('users'),
  role: chatMessageRole,
  content: v.string(),
  intent: v.optional(chatMessageIntent),
  expenseId: v.optional(v.id('expenses')),
  expenseDraftId: v.optional(v.id('expenseDrafts')),
  retainedUntil: v.optional(v.number()),
});

const expenseDraftValidator = v.object({
  _id: v.id('expenseDrafts'),
  _creationTime: v.number(),
  userId: v.id('users'),
  threadId: v.id('chatThreads'),
  amount: v.optional(v.number()),
  currency: v.optional(v.string()),
  category: v.optional(v.string()),
  categoryConfidence: v.optional(v.number()),
  merchant: v.optional(v.string()),
  note: v.optional(v.string()),
  occurredAt: v.optional(v.number()),
  missingFields: v.array(expenseDraftMissingField),
  clarificationQuestion: v.optional(v.string()),
  sourceMessageId: v.optional(v.id('chatMessages')),
  expiresAt: v.number(),
});

export const listThreadHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(chatThreadValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const limit = Math.min(args.limit ?? DEFAULT_THREAD_HISTORY_LIMIT, MAX_CHAT_QUERY_LIMIT);

    return await ctx.db
      .query('chatThreads')
      .withIndex('by_userId_and_status_and_lastMessageAt', (query) =>
        query.eq('userId', user._id).eq('status', 'active')
      )
      .order('desc')
      .take(limit);
  },
});

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(chatThreadValidator, v.null()),
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId('chatThreads', args.threadId);
    if (threadId === null) {
      return null;
    }

    const user = await getCurrentUserOrThrow(ctx);
    return await getOwnedThread(ctx, user._id, threadId);
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(chatMessageValidator),
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId('chatThreads', args.threadId);
    if (threadId === null) {
      return [];
    }

    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, threadId);

    const limit = Math.min(args.limit ?? DEFAULT_MESSAGE_LIMIT, MAX_CHAT_QUERY_LIMIT);
    return await listRecentMessages(ctx, threadId, limit);
  },
});

export const getAgentContext = internalQuery({
  args: {
    threadId: v.id('chatThreads'),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    thread: chatThreadValidator,
    messages: v.array(chatMessageValidator),
    draft: v.union(expenseDraftValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await getOwnedThreadOrThrow(ctx, user._id, args.threadId);
    const limit = Math.min(args.limit ?? DEFAULT_MESSAGE_LIMIT, MAX_CHAT_QUERY_LIMIT);

    return {
      thread,
      messages: await listRecentMessages(ctx, args.threadId, limit),
      draft: await getActiveExpenseDraft(ctx, args.threadId),
    };
  },
});

export const getSpendingSummary = internalQuery({
  args: {
    fromLocalDate: v.string(),
    toLocalDate: v.string(),
    timezone: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.object({
    fromLocalDate: v.string(),
    toLocalDate: v.string(),
    timezone: v.string(),
    category: v.optional(v.string()),
    count: v.number(),
    totals: v.array(
      v.object({
        currency: v.string(),
        amount: v.number(),
      })
    ),
    isCapped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const from = localDateToUtcTimestamp(args.fromLocalDate, args.timezone);
    const until = localDateToUtcTimestamp(addDaysToLocalDate(args.toLocalDate, 1), args.timezone);

    const expenses = args.category
      ? await ctx.db
          .query('expenses')
          .withIndex('by_userId_and_category_and_occurredAt', (query) =>
            query
              .eq('userId', user._id)
              .eq('category', args.category!)
              .gte('occurredAt', from)
              .lt('occurredAt', until)
          )
          .take(SPENDING_SUMMARY_LIMIT + 1)
      : await ctx.db
          .query('expenses')
          .withIndex('by_userId_and_occurredAt', (query) =>
            query.eq('userId', user._id).gte('occurredAt', from).lt('occurredAt', until)
          )
          .take(SPENDING_SUMMARY_LIMIT + 1);

    const totalsByCurrency = new Map<string, number>();
    const visibleExpenses = expenses.slice(0, SPENDING_SUMMARY_LIMIT);

    for (const expense of visibleExpenses) {
      totalsByCurrency.set(
        expense.currency,
        (totalsByCurrency.get(expense.currency) ?? 0) + expense.amount
      );
    }

    return {
      fromLocalDate: args.fromLocalDate,
      toLocalDate: args.toLocalDate,
      timezone: args.timezone,
      category: args.category,
      count: visibleExpenses.length,
      totals: Array.from(totalsByCurrency, ([currency, amount]) => ({
        currency,
        amount,
      })),
      isCapped: expenses.length > SPENDING_SUMMARY_LIMIT,
    };
  },
});
