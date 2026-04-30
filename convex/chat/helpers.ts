import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { DEFAULT_MESSAGE_LIMIT } from "./constants.js";

export async function getOwnedThread(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  threadId: Id<"chatThreads">,
) {
  const thread = await ctx.db.get(threadId);
  if (thread === null || thread.userId !== userId) {
    return null;
  }

  return thread;
}

export async function getOwnedThreadOrThrow(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  threadId: Id<"chatThreads">,
) {
  const thread = await getOwnedThread(ctx, userId, threadId);
  if (thread === null) {
    throw new Error("Chat thread not found");
  }

  return thread;
}

export async function listRecentMessages(
  ctx: QueryCtx,
  threadId: Id<"chatThreads">,
  limit = DEFAULT_MESSAGE_LIMIT,
) {
  const messages = await ctx.db
    .query("chatMessages")
    .withIndex("by_threadId", (query) => query.eq("threadId", threadId))
    .order("desc")
    .take(limit);

  return messages.reverse();
}

export async function getActiveExpenseDraft(
  ctx: QueryCtx | MutationCtx,
  threadId: Id<"chatThreads">,
) {
  const [draft] = await ctx.db
    .query("expenseDrafts")
    .withIndex("by_threadId", (query) => query.eq("threadId", threadId))
    .take(1);

  return draft ?? null;
}

export function createThreadTitle(content: string) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  if (normalizedContent.length <= 48) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, 45)}...`;
}
