import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const messagingProvider = v.union(v.literal("whatsapp"));

const chatMessageRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const chatMessageSource = v.union(
  v.literal("whatsapp"),
  v.literal("app"),
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

const expenseSource = v.union(
  v.literal("whatsapp"),
  v.literal("app"),
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

  messagingIdentities: defineTable({
    userId: v.id("users"),
    provider: messagingProvider,
    providerUserId: v.string(),
    phoneE164: v.optional(v.string()),
    displayName: v.optional(v.string()),
    isVerified: v.boolean(),
    linkedAt: v.number(),
    lastInboundAt: v.optional(v.number()),
    lastOutboundAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_provider_and_providerUserId", ["provider", "providerUserId"])
    .index("by_phoneE164", ["phoneE164"]),

  chatThreads: defineTable({
    userId: v.id("users"),
    messagingIdentityId: v.id("messagingIdentities"),
    provider: messagingProvider,
    status: v.union(v.literal("active"), v.literal("archived")),
    contextSummary: v.optional(v.string()),
    contextSummaryUpdatedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_messagingIdentityId", ["messagingIdentityId"])
    .index("by_userId_and_provider", ["userId", "provider"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    userId: v.id("users"),
    role: chatMessageRole,
    content: v.string(),
    source: chatMessageSource,
    providerMessageId: v.optional(v.string()),
    intent: v.optional(chatMessageIntent),
    expenseId: v.optional(v.id("expenses")),
    expenseDraftId: v.optional(v.id("expenseDrafts")),
    retainedUntil: v.optional(v.number()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"])
    .index("by_providerMessageId", ["providerMessageId"])
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
    source: expenseSource,
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
