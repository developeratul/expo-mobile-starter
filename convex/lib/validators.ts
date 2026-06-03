import { v } from 'convex/values';

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

export const accountType = v.union(
  // On-budget: participate in envelope budgeting
  v.literal('checking'),
  v.literal('savings'),
  v.literal('cash'),
  v.literal('credit_card'),
  v.literal('line_of_credit'),
  // Off-budget: tracking only (net worth, debt payoff)
  v.literal('mortgage'),
  v.literal('auto_loan'),
  v.literal('student_loan'),
  v.literal('personal_loan'),
  v.literal('medical_debt'),
  v.literal('other_debt'),
  v.literal('investment'),
  v.literal('other_asset'),
  v.literal('other_tracking'),
);

// ─── BUDGET MEMBERS ──────────────────────────────────────────────────────────

export const budgetMemberRole = v.union(
  v.literal('owner'),
  v.literal('editor'),
  v.literal('viewer'),
);

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

export const flagColor = v.union(
  v.literal('red'),
  v.literal('orange'),
  v.literal('yellow'),
  v.literal('green'),
  v.literal('blue'),
  v.literal('purple'),
);

// ─── SCHEDULED TRANSACTIONS ──────────────────────────────────────────────────

export const scheduledFrequency = v.union(
  v.literal('once'),
  v.literal('daily'),
  v.literal('weekly'),
  v.literal('every_2_weeks'),
  v.literal('twice_a_month'),
  v.literal('every_4_weeks'),
  v.literal('monthly'),
  v.literal('every_2_months'),
  v.literal('every_3_months'),
  v.literal('every_6_months'),
  v.literal('yearly'),
);

// ─── GOALS ───────────────────────────────────────────────────────────────────

export const goalType = v.union(
  v.literal('target_balance'),           // Save $X total
  v.literal('target_balance_by_date'),   // Save $X by a specific date
  v.literal('monthly_savings_builder'),  // Assign $X every month
  v.literal('needed_for_spending'),      // Have $X available by a recurring due date
  v.literal('debt_payoff'),              // Pay off linked debt account by date
);

export const goalRepeatFrequency = v.union(
  v.literal('weekly'),
  v.literal('monthly'),
  v.literal('yearly'),
);

// ─── AUDIT ───────────────────────────────────────────────────────────────────

export const auditAction = v.union(
  v.literal('create'),
  v.literal('update'),
  v.literal('delete'),
  v.literal('restore'),
  v.literal('reconcile'),
  v.literal('approve'),
);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const notificationType = v.union(
  v.literal('scheduled_due'),
  v.literal('overspent'),
  v.literal('goal_reached'),
  v.literal('low_balance'),
  v.literal('reconcile_due'),
  v.literal('budget_invitation'),
);
