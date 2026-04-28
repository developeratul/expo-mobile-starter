import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const chatMessageRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const chatMessageIntent = v.union(
  v.literal("log_expense"),
  v.literal("query_spending"),
  v.literal("clarify_expense"),
  v.literal("cancel"),
  v.literal("other"),
);

const expenseDraftMissingField = v.union(
  v.literal("amount"),
  v.literal("currency"),
  v.literal("category"),
  v.literal("merchant"),
  v.literal("occurredAt"),
);

const expenseCreatedVia = v.union(
  v.literal("chat"),
  v.literal("manual"),
);

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
    userId: v.id("users"),
    title: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    contextSummary: v.optional(v.string()),
    contextSummaryUpdatedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    userId: v.id("users"),
    role: chatMessageRole,
    content: v.string(),
    intent: v.optional(chatMessageIntent),
    expenseId: v.optional(v.id("expenses")),
    expenseDraftId: v.optional(v.id("expenseDrafts")),
    retainedUntil: v.optional(v.number()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"])
    .index("by_retainedUntil", ["retainedUntil"]),

  expenseDrafts: defineTable({
    userId: v.id("users"),
    threadId: v.id("chatThreads"),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryConfidence: v.optional(v.number()),
    merchant: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    missingFields: v.array(expenseDraftMissingField),
    clarificationQuestion: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("chatMessages")),
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_threadId", ["threadId"])
    .index("by_expiresAt", ["expiresAt"]),

  expenses: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    categoryConfidence: v.optional(v.number()),
    merchant: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.number(),
    createdVia: expenseCreatedVia,
    sourceMessageId: v.optional(v.id("chatMessages")),
    sourceDraftId: v.optional(v.id("expenseDrafts")),
    confidence: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_occurredAt", ["userId", "occurredAt"])
    .index("by_userId_and_category", ["userId", "category"])
    .index("by_userId_and_category_and_occurredAt", [
      "userId",
      "category",
      "occurredAt",
    ]),
});
