/**
 * Names of system-managed category groups. These are auto-created by
 * createBudget and must never be renamed or deleted by users.
 */
export const SYSTEM_GROUP_NAMES = {
  INTERNAL: 'Internal Master Category',
  CREDIT_CARD_PAYMENTS: 'Credit Card Payments',
} as const;

/**
 * Names of system-managed categories. These are auto-created by createBudget
 * and referenced by transaction logic — they must always exist in every budget.
 */
export const SYSTEM_CATEGORY_NAMES = {
  READY_TO_ASSIGN: 'Inflow: Ready to Assign',
  UNCATEGORIZED: 'Uncategorized',
} as const;
