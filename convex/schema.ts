import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  chatMessageIntent,
  chatMessageRole,
  expenseCreatedVia,
  expenseDraftMissingField,
  threadStatus,
} from './chat/validators';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    hasCompletedOnboarding: v.boolean(),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_email', ['email']),

  chatThreads: defineTable({
    userId: v.id('users'),
    title: v.optional(v.string()),
    status: threadStatus,
    contextSummary: v.optional(v.string()),
    contextSummaryUpdatedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_status', ['userId', 'status'])
    .index('by_userId_and_status_and_lastMessageAt', ['userId', 'status', 'lastMessageAt']),

  chatMessages: defineTable({
    threadId: v.id('chatThreads'),
    userId: v.id('users'),
    role: chatMessageRole,
    content: v.string(),
    intent: v.optional(chatMessageIntent),
    expenseId: v.optional(v.id('expenses')),
    expenseDraftId: v.optional(v.id('expenseDrafts')),
    retainedUntil: v.optional(v.number()),
  })
    .index('by_threadId', ['threadId'])
    .index('by_userId', ['userId'])
    .index('by_retainedUntil', ['retainedUntil']),

  expenseDrafts: defineTable({
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
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId'])
    .index('by_expiresAt', ['expiresAt']),

  expenses: defineTable({
    userId: v.id('users'),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    categoryConfidence: v.optional(v.number()),
    merchant: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.number(),
    createdVia: expenseCreatedVia,
    sourceMessageId: v.optional(v.id('chatMessages')),
    sourceDraftId: v.optional(v.id('expenseDrafts')),
    confidence: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_occurredAt', ['userId', 'occurredAt'])
    .index('by_userId_and_category', ['userId', 'category'])
    .index('by_userId_and_category_and_occurredAt', ['userId', 'category', 'occurredAt']),
});
