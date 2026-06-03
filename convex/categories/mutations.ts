import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { assertBudgetAccess } from '../lib/auth.js';
import { SYSTEM_GROUP_NAMES } from '../lib/constants.js';
import { goalType, goalRepeatFrequency } from '../lib/validators.js';

const goalValidator = v.object({
  type: goalType,
  targetAmountCents: v.number(),
  targetDate: v.optional(v.string()),
  monthlyAmountCents: v.optional(v.number()),
  dayOfMonth: v.optional(v.number()),
  repeatFrequency: v.optional(goalRepeatFrequency),
  linkedAccountId: v.optional(v.id('accounts')),
});

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export const createGroup = mutation({
  args: {
    budgetId: v.id('budgets'),
    name: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id('categoryGroups'),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    return await ctx.db.insert('categoryGroups', {
      budgetId: args.budgetId,
      name: args.name,
      isSystem: false,
      sortOrder: args.sortOrder,
      isDeleted: false,
    });
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id('categoryGroups'),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group || group.isDeleted) throw new ConvexError('Group not found');
    if (group.isSystem) throw new ConvexError('Cannot edit system groups');

    await assertBudgetAccess(ctx, group.budgetId, 'editor');

    const { groupId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(groupId, patch);
    }

    return null;
  },
});

export const removeGroup = mutation({
  args: { groupId: v.id('categoryGroups') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group || group.isDeleted) throw new ConvexError('Group not found');
    if (group.isSystem) throw new ConvexError('Cannot delete system groups');

    await assertBudgetAccess(ctx, group.budgetId, 'editor');

    // Soft-delete all categories in the group
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_groupId', q => q.eq('groupId', args.groupId))
      .collect();

    const now = Date.now();
    await Promise.all(
      categories
        .filter(c => !c.isSystem)
        .map(c => ctx.db.patch(c._id, { isDeleted: true, deletedAt: now })),
    );

    await ctx.db.patch(args.groupId, { isDeleted: true, deletedAt: now });
    return null;
  },
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    budgetId: v.id('budgets'),
    groupId: v.id('categoryGroups'),
    name: v.string(),
    sortOrder: v.number(),
    note: v.optional(v.string()),
    goal: v.optional(goalValidator),
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    await assertBudgetAccess(ctx, args.budgetId, 'editor');

    const group = await ctx.db.get(args.groupId);
    if (!group || group.isDeleted || group.budgetId !== args.budgetId) {
      throw new ConvexError('Group not found in this budget');
    }
    if (group.isSystem && group.name === SYSTEM_GROUP_NAMES.INTERNAL) {
      throw new ConvexError('Cannot add categories to Internal Master Category');
    }

    return await ctx.db.insert('categories', {
      budgetId: args.budgetId,
      groupId: args.groupId,
      name: args.name,
      isSystem: false,
      note: args.note,
      sortOrder: args.sortOrder,
      goal: args.goal,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    categoryId: v.id('categories'),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    groupId: v.optional(v.id('categoryGroups')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throw new ConvexError('Category not found');
    if (category.isSystem) throw new ConvexError('Cannot edit system categories');

    await assertBudgetAccess(ctx, category.budgetId, 'editor');

    const { categoryId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(categoryId, patch);
    }

    return null;
  },
});

export const setGoal = mutation({
  args: {
    categoryId: v.id('categories'),
    goal: goalValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throw new ConvexError('Category not found');
    if (category.isSystem) throw new ConvexError('Cannot set goals on system categories');

    await assertBudgetAccess(ctx, category.budgetId, 'editor');
    await ctx.db.patch(args.categoryId, { goal: args.goal });
    return null;
  },
});

export const clearGoal = mutation({
  args: { categoryId: v.id('categories') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throw new ConvexError('Category not found');

    await assertBudgetAccess(ctx, category.budgetId, 'editor');
    await ctx.db.patch(args.categoryId, { goal: undefined });
    return null;
  },
});

export const remove = mutation({
  args: { categoryId: v.id('categories') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throw new ConvexError('Category not found');
    if (category.isSystem) throw new ConvexError('Cannot delete system categories');
    if (category.creditCardAccountId) {
      throw new ConvexError(
        'Cannot delete a CC payment category directly. Delete the account instead.',
      );
    }

    await assertBudgetAccess(ctx, category.budgetId, 'editor');
    await ctx.db.patch(args.categoryId, { isDeleted: true, deletedAt: Date.now() });
    return null;
  },
});
