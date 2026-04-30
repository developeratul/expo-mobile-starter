import { v } from 'convex/values';

export const threadStatus = v.union(v.literal('active'), v.literal('archived'));

export const chatMessageRole = v.union(v.literal('user'), v.literal('assistant'), v.literal('system'));

export const chatMessageIntent = v.union(
  v.literal('log_expense'),
  v.literal('query_spending'),
  v.literal('clarify_expense'),
  v.literal('cancel'),
  v.literal('other')
);

export const expenseDraftMissingField = v.union(
  v.literal('amount'),
  v.literal('currency'),
  v.literal('category'),
  v.literal('merchant'),
  v.literal('occurredAt')
);

export const expenseCreatedVia = v.union(v.literal('chat'), v.literal('manual'));
