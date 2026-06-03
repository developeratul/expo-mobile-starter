import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  chatMessageIntent,
  chatMessageRole,
  expenseCreatedVia,
  expenseDraftMissingField,
  threadStatus,
} from './chat/validators';
import {
  accountType,
  auditAction,
  budgetMemberRole,
  flagColor,
  goalRepeatFrequency,
  goalType,
  notificationType,
  scheduledFrequency,
} from './lib/validators';

export default defineSchema({
  // ─── USERS ────────────────────────────────────────────────────────────────
  // Extended with optional budget-specific profile fields.

  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    hasCompletedOnboarding: v.boolean(),
    // Budget profile
    defaultCurrencyCode: v.optional(v.string()), // e.g. "USD"
    timezone: v.optional(v.string()), // e.g. "America/New_York"
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

  // ─── BUDGETS ──────────────────────────────────────────────────────────────
  // Top-level container. One user can own many budgets.
  // The ownerId is denormalized here for fast ownership lookups;
  // actual access control is enforced via budgetMembers.

  budgets: defineTable({
    name: v.string(),
    ownerId: v.id('users'),
    currencyCode: v.string(),
    // "YYYY-MM" of the earliest month that has any data in this budget.
    // Used as the lower bound for month navigation.
    firstMonthKey: v.string(),
    // Display preferences
    numberFormat: v.union(
      v.literal('comma_dot'), // 1,234.56 (US)
      v.literal('dot_comma'), // 1.234,56 (EU)
      v.literal('space_dot') // 1 234.56
    ),
    dateFormat: v.string(), // e.g. "MM/DD/YYYY"
    showCents: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_ownerId_and_isDeleted', ['ownerId', 'isDeleted']),

  // ─── BUDGET MEMBERS ───────────────────────────────────────────────────────
  // RBAC join table. Every access-control check queries this table first.
  // The owner always has a row here in addition to owning the budget.

  budgetMembers: defineTable({
    budgetId: v.id('budgets'),
    userId: v.id('users'),
    role: budgetMemberRole,
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_userId', ['userId'])
    .index('by_budgetId_and_userId', ['budgetId', 'userId']),

  // ─── ACCOUNTS ─────────────────────────────────────────────────────────────
  // Represents every financial account in a budget. On-budget accounts
  // participate in envelope budgeting; off-budget accounts are tracked
  // for net worth only.
  //
  // Balances are stored in minor units (cents) to avoid floating-point bugs.
  // All three balance fields are denormalized and kept in sync on every
  // transaction write. workingBalance = clearedBalance + unclearedBalance.

  accounts: defineTable({
    budgetId: v.id('budgets'),
    name: v.string(),
    type: accountType,
    // true = envelope budgeting, false = tracking only (net worth)
    onBudget: v.boolean(),
    // All balances in minor units (cents)
    clearedBalanceCents: v.number(),
    unclearedBalanceCents: v.number(),
    workingBalanceCents: v.number(),
    // Debt account metadata
    originalDebtCents: v.optional(v.number()),
    // Stored as basis points (e.g. 2450 = 24.50%) to avoid floats
    interestRateBasisPoints: v.optional(v.number()),
    minimumPaymentCents: v.optional(v.number()),
    currencyCode: v.string(),
    note: v.optional(v.string()),
    sortOrder: v.number(),
    // Last reconciliation snapshot
    lastReconciledAt: v.optional(v.number()),
    lastReconciledBalanceCents: v.optional(v.number()),
    // Import metadata (only last 4 digits of account number stored)
    institutionName: v.optional(v.string()),
    accountNumberSuffix: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_budgetId_and_type', ['budgetId', 'type'])
    .index('by_budgetId_and_onBudget', ['budgetId', 'onBudget'])
    .index('by_budgetId_and_isDeleted', ['budgetId', 'isDeleted']),

  // ─── PAYEES ───────────────────────────────────────────────────────────────
  // Named transaction recipients. Transfer payees are auto-created when an
  // account is created (transferAccountId links them). lastCategoryId
  // powers auto-categorization when the payee is selected again.

  payees: defineTable({
    budgetId: v.id('budgets'),
    name: v.string(),
    // Set only for auto-generated transfer payees (one per account)
    transferAccountId: v.optional(v.id('accounts')),
    // Remembered for auto-categorization suggestions
    lastCategoryId: v.optional(v.id('categories')),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_budgetId_and_name', ['budgetId', 'name'])
    .index('by_transferAccountId', ['transferAccountId']),

  // ─── CATEGORY GROUPS ──────────────────────────────────────────────────────
  // Containers that hold categories. Two system groups are auto-created per
  // budget: "Credit Card Payments" (isSystem=true) and
  // "Internal Master Category" (isSystem=true, holds Uncategorized + RTA).

  categoryGroups: defineTable({
    budgetId: v.id('budgets'),
    name: v.string(),
    isSystem: v.boolean(),
    sortOrder: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_budgetId_and_isSystem', ['budgetId', 'isSystem']),

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  // Budget envelopes. The goal object is embedded since it always belongs to
  // exactly one category and has a bounded, stable structure.
  //
  // System categories (isSystem=true):
  //   - "Inflow: Ready to Assign" — receives all income transactions
  //   - "Uncategorized" — holds uncategorized transactions
  //
  // Credit card payment categories (creditCardAccountId set):
  //   - One auto-created per credit_card account
  //   - activityCents is funded automatically when the card is used

  categories: defineTable({
    budgetId: v.id('budgets'),
    groupId: v.id('categoryGroups'),
    name: v.string(),
    isSystem: v.boolean(),
    creditCardAccountId: v.optional(v.id('accounts')),
    note: v.optional(v.string()),
    sortOrder: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    // Optional savings/spending goal. Embedded because it's structurally
    // stable and always 1:1 with the category.
    goal: v.optional(
      v.object({
        type: goalType,
        targetAmountCents: v.number(),
        // ISO date string "YYYY-MM-DD" — used by date-based goal types
        targetDate: v.optional(v.string()),
        // For monthly_savings_builder
        monthlyAmountCents: v.optional(v.number()),
        // For needed_for_spending: day of month the money is due
        dayOfMonth: v.optional(v.number()),
        repeatFrequency: v.optional(goalRepeatFrequency),
        // For debt_payoff: the account whose balance drives the calculation
        linkedAccountId: v.optional(v.id('accounts')),
      })
    ),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_groupId', ['groupId'])
    .index('by_budgetId_and_isSystem', ['budgetId', 'isSystem'])
    .index('by_creditCardAccountId', ['creditCardAccountId']),

  // ─── MONTH BUDGETS ────────────────────────────────────────────────────────
  // One row per (category × month). This is the core YNAB envelope table.
  //
  // All four amount fields are kept in minor units (cents).
  // activityCents and availableCents are denormalized for O(1) reads and
  // recalculated atomically inside the same mutation that writes the triggering
  // transaction or assignment change.
  //
  // availableCents = carryOverCents + assignedCents + activityCents
  //
  // carryOverCents is set at the start of each month:
  //   - Cash/savings accounts: previous month's availableCents (positive or negative)
  //   - Credit card overspending: the overspent amount flows to the CC Payment
  //     category instead of carrying over as a penalty

  monthBudgets: defineTable({
    budgetId: v.id('budgets'),
    categoryId: v.id('categories'),
    monthKey: v.string(), // "YYYY-MM"
    assignedCents: v.number(), // manually assigned this month
    activityCents: v.number(), // sum of transaction amounts (negative = spending)
    carryOverCents: v.number(), // rolled forward from previous month
    availableCents: v.number(), // = carryOver + assigned + activity
    note: v.optional(v.string()),
  })
    .index('by_budgetId_and_monthKey', ['budgetId', 'monthKey'])
    .index('by_categoryId_and_monthKey', ['categoryId', 'monthKey'])
    .index('by_budgetId_and_categoryId', ['budgetId', 'categoryId']),

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────
  // Represents every money movement. Transfers create two linked rows.
  // Split transactions create a parent row (isSplit=true, no category) and
  // child rows (parentTransactionId set, each with their own category).
  //
  // All amounts in minor units. Negative = outflow, positive = inflow.
  //
  // reconciled=true makes a transaction immutable — it cannot be edited or
  // deleted. This protects audited history.
  //
  // monthKey is denormalized from date for index efficiency. It must always
  // equal date.slice(0, 7) and is set server-side, never trusted from client.

  transactions: defineTable({
    budgetId: v.id('budgets'),
    accountId: v.id('accounts'),
    amountCents: v.number(),
    date: v.string(), // "YYYY-MM-DD"
    monthKey: v.string(), // "YYYY-MM" (denormalized, set server-side)
    payeeId: v.optional(v.id('payees')),
    categoryId: v.optional(v.id('categories')),
    memo: v.optional(v.string()),
    cleared: v.boolean(),
    approved: v.boolean(),
    // Once reconciled, this transaction is immutable
    reconciled: v.boolean(),
    // Transfer: both sides link to each other
    transferTransactionId: v.optional(v.id('transactions')),
    // Split: children link to their parent
    parentTransactionId: v.optional(v.id('transactions')),
    isSplit: v.boolean(),
    // Import idempotency key — prevents duplicate imports
    importId: v.optional(v.string()),
    // Original payee name from import (before normalization)
    importPayeeName: v.optional(v.string()),
    // Scheduled transaction that generated this instance
    scheduledTransactionId: v.optional(v.id('scheduledTransactions')),
    flagColor: v.optional(flagColor),
    currencyCode: v.string(),
    // Multi-currency: original amount before conversion
    originalAmountCents: v.optional(v.number()),
    originalCurrencyCode: v.optional(v.string()),
    // Exchange rate stored as rate × 1,000,000 to avoid floats
    exchangeRateMicros: v.optional(v.number()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdBy: v.id('users'),
    updatedBy: v.optional(v.id('users')),
  })
    .index('by_accountId_and_date', ['accountId', 'date'])
    .index('by_budgetId_and_date', ['budgetId', 'date'])
    .index('by_budgetId_and_monthKey', ['budgetId', 'monthKey'])
    .index('by_categoryId_and_monthKey', ['categoryId', 'monthKey'])
    .index('by_payeeId', ['payeeId'])
    .index('by_scheduledTransactionId', ['scheduledTransactionId'])
    .index('by_transferTransactionId', ['transferTransactionId'])
    .index('by_parentTransactionId', ['parentTransactionId'])
    .index('by_importId', ['importId']),

  // ─── SCHEDULED TRANSACTIONS ───────────────────────────────────────────────
  // Recurring transaction rules. A cron action walks this table daily,
  // finds rows where nextOccurrenceDate <= today, generates a real
  // transaction (with scheduledTransactionId back-link), then advances
  // nextOccurrenceDate to the next occurrence.
  //
  // frequency='once' rules are deactivated (isActive=false) after generation.

  scheduledTransactions: defineTable({
    budgetId: v.id('budgets'),
    accountId: v.id('accounts'),
    amountCents: v.number(),
    payeeId: v.optional(v.id('payees')),
    categoryId: v.optional(v.id('categories')),
    memo: v.optional(v.string()),
    frequency: scheduledFrequency,
    nextOccurrenceDate: v.string(), // "YYYY-MM-DD"
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.optional(v.string()), // "YYYY-MM-DD" — null means infinite
    isActive: v.boolean(),
    // For scheduled transfers
    transferAccountId: v.optional(v.id('accounts')),
    flagColor: v.optional(flagColor),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdBy: v.id('users'),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_budgetId_and_nextOccurrenceDate', ['budgetId', 'nextOccurrenceDate'])
    .index('by_accountId', ['accountId']),

  // ─── RECONCILIATIONS ──────────────────────────────────────────────────────
  // Records each completed reconciliation session. The set of transactions
  // cleared during this session is stored in reconciliationEntries (separate
  // table to avoid unbounded arrays).

  reconciliations: defineTable({
    budgetId: v.id('budgets'),
    accountId: v.id('accounts'),
    startingBalanceCents: v.number(),
    statementBalanceCents: v.number(),
    reconciledAt: v.number(),
    createdBy: v.id('users'),
  })
    .index('by_accountId', ['accountId'])
    .index('by_budgetId_and_accountId', ['budgetId', 'accountId']),

  // ─── RECONCILIATION ENTRIES ───────────────────────────────────────────────
  // Links each transaction reconciled in a session to its reconciliation record.
  // Kept as a separate table to avoid the 1 MB document size limit.

  reconciliationEntries: defineTable({
    reconciliationId: v.id('reconciliations'),
    transactionId: v.id('transactions'),
    budgetId: v.id('budgets'), // denormalized for budget-scoped queries
  })
    .index('by_reconciliationId', ['reconciliationId'])
    .index('by_transactionId', ['transactionId'])
    .index('by_budgetId', ['budgetId']),

  // ─── TAGS ─────────────────────────────────────────────────────────────────
  // User-defined labels that can be attached to any transaction.
  // The many-to-many relationship is handled by transactionTags.

  tags: defineTable({
    budgetId: v.id('budgets'),
    name: v.string(),
    // Color stored as a semantic token name, not a raw hex value,
    // so the UI can map it to the active theme correctly.
    colorToken: v.optional(v.string()),
    isDeleted: v.boolean(),
  }).index('by_budgetId', ['budgetId']),

  // ─── TRANSACTION TAGS ─────────────────────────────────────────────────────

  transactionTags: defineTable({
    transactionId: v.id('transactions'),
    tagId: v.id('tags'),
    budgetId: v.id('budgets'), // denormalized for budget-scoped tag queries
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_tagId', ['tagId'])
    .index('by_budgetId_and_tagId', ['budgetId', 'tagId']),

  // ─── ATTACHMENTS ──────────────────────────────────────────────────────────
  // Receipts and supporting documents linked to transactions.
  // The actual file is stored in Convex file storage; storageId references it.

  attachments: defineTable({
    budgetId: v.id('budgets'),
    transactionId: v.id('transactions'),
    storageId: v.id('_storage'),
    fileName: v.string(),
    mimeType: v.string(),
    fileSizeBytes: v.number(),
    uploadedBy: v.id('users'),
    uploadedAt: v.number(),
    isDeleted: v.boolean(),
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_budgetId', ['budgetId']),

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────
  // Append-only event log. Powers both the undo history UI and the audit trail.
  //
  // before/after store JSON snapshots of the document state before and after
  // the change — enough to reconstruct what happened and to support undo.
  //
  // batchId groups all audit events written in a single mutation (e.g. all
  // rows created when a split transaction is saved). This lets the undo system
  // reverse an entire logical operation atomically.
  //
  // This table is append-only. Old events should be archived (not deleted)
  // after 90 days to keep the table performant.

  auditEvents: defineTable({
    budgetId: v.id('budgets'),
    userId: v.id('users'),
    entityType: v.string(), // "transaction" | "category" | "account" | etc.
    entityId: v.string(), // The _id of the affected document
    action: auditAction,
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    timestamp: v.number(),
    // Groups related changes from one logical operation
    batchId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
  })
    .index('by_budgetId_and_timestamp', ['budgetId', 'timestamp'])
    .index('by_entityId', ['entityId'])
    .index('by_budgetId_and_entityType', ['budgetId', 'entityType'])
    .index('by_batchId', ['batchId']),

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  // Per-user alert inbox. Generated by server-side mutations/actions when
  // relevant events occur (scheduled transaction due, overspending, etc.).

  notifications: defineTable({
    userId: v.id('users'),
    budgetId: v.optional(v.id('budgets')),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    // Optional deep-link target for navigation
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_userId_and_isRead', ['userId', 'isRead'])
    .index('by_userId_and_createdAt', ['userId', 'createdAt']),

  // ─── CURRENCY RATES ───────────────────────────────────────────────────────
  // Cached FX rates for multi-currency support. Refreshed hourly via a
  // Convex action. rateMicros = actual rate × 1,000,000 (avoids floats).
  // e.g. 1 USD → 0.92 EUR is stored as rateMicros = 920000.

  currencyRates: defineTable({
    fromCode: v.string(), // ISO 4217, e.g. "USD"
    toCode: v.string(), // ISO 4217, e.g. "EUR"
    rateMicros: v.number(),
    fetchedAt: v.number(),
  }).index('by_fromCode_and_toCode', ['fromCode', 'toCode']),

  // ─── SIMULATIONS ──────────────────────────────────────────────────────────
  // Saved "what-if" scenario containers. The actual scenario data lives in
  // simulationAssignments and simulationTransactions to respect the
  // unbounded-array constraint.

  simulations: defineTable({
    budgetId: v.id('budgets'),
    name: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.id('users'),
    createdAt: v.number(),
    isDeleted: v.boolean(),
  })
    .index('by_budgetId', ['budgetId'])
    .index('by_createdBy', ['createdBy']),

  // ─── SIMULATION ASSIGNMENTS ───────────────────────────────────────────────
  // What-if budget assignments for a simulation scenario.
  // These shadow the real monthBudgets rows without modifying them.

  simulationAssignments: defineTable({
    simulationId: v.id('simulations'),
    categoryId: v.id('categories'),
    monthKey: v.string(), // "YYYY-MM"
    assignedCents: v.number(),
  })
    .index('by_simulationId', ['simulationId'])
    .index('by_simulationId_and_monthKey', ['simulationId', 'monthKey']),

  // ─── SIMULATION TRANSACTIONS ──────────────────────────────────────────────
  // Hypothetical transactions that exist only within a simulation scenario.
  // Used to model "what if I bought X?" without touching real transaction data.

  simulationTransactions: defineTable({
    simulationId: v.id('simulations'),
    accountId: v.id('accounts'),
    categoryId: v.optional(v.id('categories')),
    amountCents: v.number(),
    date: v.string(), // "YYYY-MM-DD"
    memo: v.optional(v.string()),
  }).index('by_simulationId', ['simulationId']),
});
