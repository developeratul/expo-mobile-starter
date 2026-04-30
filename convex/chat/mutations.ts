import { v } from 'convex/values';
import { internalMutation, mutation } from '../_generated/server';
import { getCurrentUserOrThrow } from '../users/helpers.js';
import { DRAFT_TTL_MS, MESSAGE_RETENTION_MS } from './constants.js';
import { createThreadTitle, getActiveExpenseDraft, getOwnedThreadOrThrow } from './helpers.js';
import type { Id } from '../_generated/dataModel';
import { chatMessageIntent, expenseDraftMissingField } from './validators.js';

export const archiveThread = mutation({
  args: {
    threadId: v.id('chatThreads'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    await ctx.db.patch(args.threadId, { status: 'archived' });
    return null;
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.id('chatThreads'),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    await ctx.db.patch(args.threadId, { title: createThreadTitle(args.title) });
    return null;
  },
});

export const prepareUserMessage = internalMutation({
  args: {
    threadId: v.optional(v.id('chatThreads')),
    content: v.string(),
  },
  returns: v.object({
    threadId: v.id('chatThreads'),
    userMessageId: v.id('chatMessages'),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    let threadId = args.threadId;
    if (threadId === undefined) {
      threadId = await ctx.db.insert('chatThreads', {
        userId: user._id,
        title: createThreadTitle(args.content),
        status: 'active',
        lastMessageAt: now,
      });
    } else {
      await getOwnedThreadOrThrow(ctx, user._id, threadId);
      await ctx.db.patch(threadId, {
        status: 'active',
        lastMessageAt: now,
      });
    }

    const userMessageId = await ctx.db.insert('chatMessages', {
      threadId,
      userId: user._id,
      role: 'user',
      content: args.content,
      retainedUntil: now + MESSAGE_RETENTION_MS,
    });

    return { threadId, userMessageId };
  },
});

export const insertAssistantMessage = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    content: v.string(),
    intent: v.optional(chatMessageIntent),
    expenseId: v.optional(v.id('expenses')),
    expenseDraftId: v.optional(v.id('expenseDrafts')),
  },
  returns: v.id('chatMessages'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    const now = Date.now();
    const assistantMessageId = await ctx.db.insert('chatMessages', {
      threadId: args.threadId,
      userId: user._id,
      role: 'assistant',
      content: args.content,
      intent: args.intent,
      expenseId: args.expenseId,
      expenseDraftId: args.expenseDraftId,
      retainedUntil: now + MESSAGE_RETENTION_MS,
    });

    await ctx.db.patch(args.threadId, { lastMessageAt: now });
    return assistantMessageId;
  },
});

export const createExpenseFromChat = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    sourceMessageId: v.id('chatMessages'),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    categoryConfidence: v.optional(v.number()),
    merchant: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    confidence: v.optional(v.number()),
  },
  returns: v.id('expenses'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    const draft = await getActiveExpenseDraft(ctx, args.threadId);
    const expenseId = await ctx.db.insert('expenses', {
      userId: user._id,
      amount: args.amount,
      currency: args.currency.toUpperCase(),
      category: args.category,
      categoryConfidence: args.categoryConfidence,
      merchant: args.merchant,
      note: args.note,
      occurredAt: args.occurredAt ?? Date.now(),
      createdVia: 'chat',
      sourceMessageId: args.sourceMessageId,
      sourceDraftId: draft?._id,
      confidence: args.confidence,
    });

    if (draft !== null) {
      await ctx.db.delete(draft._id);
    }

    await ctx.db.patch(args.sourceMessageId, {
      intent: 'log_expense',
      expenseId,
    });

    return expenseId;
  },
});

export const saveExpenseDraft = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    sourceMessageId: v.id('chatMessages'),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryConfidence: v.optional(v.number()),
    merchant: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    missingFields: v.array(expenseDraftMissingField),
    clarificationQuestion: v.string(),
  },
  returns: v.id('expenseDrafts'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    const existingDraft = await getActiveExpenseDraft(ctx, args.threadId);
    const draftAttributes = {
      userId: user._id,
      threadId: args.threadId,
      amount: args.amount,
      currency: args.currency?.toUpperCase(),
      category: args.category,
      categoryConfidence: args.categoryConfidence,
      merchant: args.merchant,
      note: args.note,
      occurredAt: args.occurredAt,
      missingFields: args.missingFields,
      clarificationQuestion: args.clarificationQuestion,
      sourceMessageId: args.sourceMessageId,
      expiresAt: Date.now() + DRAFT_TTL_MS,
    };

    let draftId: Id<'expenseDrafts'>;
    if (!existingDraft) {
      draftId = await ctx.db.insert('expenseDrafts', draftAttributes);
    } else {
      await ctx.db.patch(existingDraft._id, draftAttributes);
      draftId = existingDraft._id;
    }

    await ctx.db.patch(args.sourceMessageId, {
      intent: 'clarify_expense',
      expenseDraftId: draftId,
    });

    return draftId;
  },
});

export const clearExpenseDraft = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    sourceMessageId: v.optional(v.id('chatMessages')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await getOwnedThreadOrThrow(ctx, user._id, args.threadId);

    const drafts = await ctx.db
      .query('expenseDrafts')
      .withIndex('by_threadId', (query) => query.eq('threadId', args.threadId))
      .take(10);

    for (const draft of drafts) {
      await ctx.db.delete(draft._id);
    }

    if (args.sourceMessageId !== undefined && drafts.length > 0) {
      await ctx.db.patch(args.sourceMessageId, { intent: 'cancel' });
    }

    return null;
  },
});
