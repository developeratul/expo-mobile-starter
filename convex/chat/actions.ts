'use node';

import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { action } from '../_generated/server';
import { v } from 'convex/values';

type ChatIntent = 'log_expense' | 'query_spending' | 'clarify_expense' | 'cancel' | 'other';

type PreparedMessage = {
  threadId: Id<'chatThreads'>;
  userMessageId: Id<'chatMessages'>;
};

type AgentContext = {
  thread: Doc<'chatThreads'>;
  messages: Array<Doc<'chatMessages'>>;
  draft: Doc<'expenseDrafts'> | null;
};

type SendMessageResult = {
  threadId: Id<'chatThreads'>;
  userMessageId: Id<'chatMessages'>;
  assistantMessageId?: Id<'chatMessages'>;
};

type AiProvider = 'google' | 'openai';

type ToolOutcome = {
  intent: ChatIntent;
  expenseId?: Id<'expenses'>;
  draftId?: Id<'expenseDrafts'>;
};

const DEFAULT_AI_PROVIDER: AiProvider = 'google';
const DEFAULT_MODELS = {
  google: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
} as const satisfies Record<AiProvider, string>;

const currencySchema = z.string().regex(/^[A-Z]{3}$/i, 'Currency must be a 3-letter ISO code');

export const sendMessage = action({
  args: {
    threadId: v.optional(v.id('chatThreads')),
    content: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.id('chatThreads'),
    userMessageId: v.id('chatMessages'),
    assistantMessageId: v.optional(v.id('chatMessages')),
  }),
  handler: async (ctx, args): Promise<SendMessageResult> => {
    const content = args.content.trim();
    if (content.length === 0) {
      throw new Error('Message cannot be empty');
    }

    const prepared: PreparedMessage = await ctx.runMutation(
      internal.chat.mutations.prepareUserMessage,
      {
        threadId: args.threadId,
        content,
      }
    );

    try {
      const context: AgentContext = await ctx.runQuery(internal.chat.queries.getAgentContext, {
        threadId: prepared.threadId,
        limit: 20,
      });

      const timezone = args.timezone ?? 'UTC';

      const result = await generateText({
        model: getLanguageModel(),
        system: createSystemPrompt(context.thread.contextSummary, context.draft, timezone),
        messages: createModelMessages(context.messages),
        tools: {
          createExpense: tool({
            description:
              'Create a finalized expense after enough details are known. Use only when the expense can be saved without another clarification.',
            inputSchema: z.object({
              amount: z.number().positive(),
              currency: currencySchema,
              category: z.string().min(1),
              categoryConfidence: z.number().min(0).max(1).optional(),
              merchant: z.string().optional(),
              note: z.string().optional(),
              occurredAt: z
                .number()
                .describe('Unix timestamp in milliseconds. Omit to use now.')
                .optional(),
              confidence: z.number().min(0).max(1).optional(),
            }),
            strict: true,
            execute: async (input): Promise<{ status: string; expenseId: Id<'expenses'> }> => {
              const expenseId: Id<'expenses'> = await ctx.runMutation(
                internal.chat.mutations.createExpenseFromChat,
                {
                  threadId: prepared.threadId,
                  sourceMessageId: prepared.userMessageId,
                  ...input,
                }
              );

              return {
                status: 'created',
                expenseId,
              };
            },
          }),
          saveExpenseDraft: tool({
            description:
              'Save an incomplete expense draft and ask exactly one clarification question.',
            inputSchema: z.object({
              amount: z.number().positive().optional(),
              currency: currencySchema.optional(),
              category: z.string().optional(),
              categoryConfidence: z.number().min(0).max(1).optional(),
              merchant: z.string().optional(),
              note: z.string().optional(),
              occurredAt: z
                .number()
                .describe('Unix timestamp in milliseconds when known.')
                .optional(),
              missingFields: z.array(
                z.enum(['amount', 'currency', 'category', 'merchant', 'occurredAt'])
              ),
              clarificationQuestion: z.string().min(1),
            }),
            strict: true,
            execute: async (
              input
            ): Promise<{
              status: string;
              draftId: Id<'expenseDrafts'>;
              clarificationQuestion: string;
            }> => {
              const draftId: Id<'expenseDrafts'> = await ctx.runMutation(
                internal.chat.mutations.saveExpenseDraft,
                {
                  threadId: prepared.threadId,
                  sourceMessageId: prepared.userMessageId,
                  ...input,
                }
              );

              return {
                status: 'draft_saved',
                draftId,
                clarificationQuestion: input.clarificationQuestion,
              };
            },
          }),
          clearExpenseDraft: tool({
            description:
              'Clear the active expense draft when the user cancels, dismisses it, or starts over.',
            inputSchema: z.object({}),
            strict: true,
            execute: async (): Promise<{ status: string }> => {
              await ctx.runMutation(internal.chat.mutations.clearExpenseDraft, {
                threadId: prepared.threadId,
                sourceMessageId: prepared.userMessageId,
              });

              return { status: 'draft_cleared' };
            },
          }),
          getSpendingSummary: tool({
            description:
              "Answer spending questions by querying saved expenses for a local date window and optional category. Use YYYY-MM-DD dates in the user's timezone.",
            inputSchema: z.object({
              fromLocalDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .describe("Start local date as YYYY-MM-DD in the user's timezone."),
              toLocalDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .describe("End local date as YYYY-MM-DD in the user's timezone."),
              category: z.string().optional(),
            }),
            strict: true,
            execute: async (
              input
            ): Promise<{
              fromLocalDate: string;
              toLocalDate: string;
              timezone: string;
              category?: string;
              count: number;
              totals: Array<{ currency: string; amount: number }>;
              isCapped: boolean;
            }> => {
              return await ctx.runQuery(internal.chat.queries.getSpendingSummary, {
                ...input,
                timezone,
              });
            },
          }),
        },
        stopWhen: stepCountIs(5),
      });

      const assistantContent: string =
        result.text.trim() || 'Done. What would you like to do next?';
      const toolOutcome = getToolOutcome(result);

      const assistantMessageId: Id<'chatMessages'> = await ctx.runMutation(
        internal.chat.mutations.insertAssistantMessage,
        {
          threadId: prepared.threadId,
          content: assistantContent,
          intent: toolOutcome.intent,
          expenseId: toolOutcome.expenseId,
          expenseDraftId: toolOutcome.draftId,
        }
      );

      return {
        threadId: prepared.threadId,
        userMessageId: prepared.userMessageId,
        assistantMessageId,
      };
    } catch (error) {
      const assistantMessageId: Id<'chatMessages'> = await ctx.runMutation(
        internal.chat.mutations.insertAssistantMessage,
        {
          threadId: prepared.threadId,
          content: "I couldn't process that message right now. Please try again in a moment.",
          intent: 'other',
        }
      );

      console.error('AI chat action failed', error);
      return {
        threadId: prepared.threadId,
        userMessageId: prepared.userMessageId,
        assistantMessageId,
      };
    }
  },
});

function getLanguageModel() {
  const provider = getAiProvider();
  const modelName = getModelName(provider);

  switch (provider) {
    case 'google':
      return google(modelName as Parameters<typeof google>[0]);
    case 'openai':
      return openai(modelName as Parameters<typeof openai>[0]);
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported AI provider: ${exhaustiveCheck}`);
    }
  }
}

function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === 'google' || provider === 'openai') {
    return provider;
  }

  if (provider !== undefined && provider.length > 0) {
    console.warn(`Unsupported AI_PROVIDER "${provider}". Falling back to ${DEFAULT_AI_PROVIDER}.`);
  }

  return DEFAULT_AI_PROVIDER;
}

function getModelName(provider: AiProvider) {
  return process.env.AI_MODEL ?? DEFAULT_MODELS[provider];
}

function createModelMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function getToolOutcome(result: {
  steps: ReadonlyArray<{ toolResults: ReadonlyArray<unknown> }>;
}): ToolOutcome {
  const toolResults = result.steps.flatMap((step) => step.toolResults);

  for (const toolResult of toolResults) {
    if (!isToolResult(toolResult)) continue;

    switch (toolResult.toolName) {
      case 'createExpense':
        return {
          intent: 'log_expense',
          expenseId: getRecordId(toolResult.output, 'expenseId') as Id<'expenses'> | undefined,
        };
      case 'saveExpenseDraft':
        return {
          intent: 'clarify_expense',
          draftId: getRecordId(toolResult.output, 'draftId') as Id<'expenseDrafts'> | undefined,
        };
      case 'clearExpenseDraft':
        return { intent: 'cancel' };
      case 'getSpendingSummary':
        return { intent: 'query_spending' };
    }
  }

  return { intent: 'other' };
}

function isToolResult(value: unknown): value is { toolName: string; output: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toolName' in value &&
    'output' in value &&
    typeof value.toolName === 'string'
  );
}

function getRecordId(record: unknown, key: string) {
  if (typeof record !== 'object' || record === null || !(key in record)) {
    return undefined;
  }

  const value = record[key as keyof typeof record];
  return typeof value === 'string' ? value : undefined;
}

function createSystemPrompt(
  contextSummary: string | undefined,
  draft: Doc<'expenseDrafts'> | null,
  timezone: string
) {
  const localTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: timezone,
  }).format(new Date());

  return [
    'You are Claire, a concise personal finance assistant inside a mobile app.',
    'You help users log expenses, clarify incomplete expense entries, and answer spending questions from saved data.',
    'Never say an expense was saved unless the createExpense tool succeeded.',
    'Ask one clarification question at a time.',
    'Infer expense category when confidence is good. Ask about category only when ambiguity materially affects tracking.',
    'Use currency codes like USD, EUR, GBP, or BDT.',
    `User timezone: ${timezone}.`,
    `Current user local time: ${localTime}.`,
    'For spending summaries, convert phrases like today, yesterday, this week, and last month into YYYY-MM-DD local dates in the user timezone.',
    contextSummary ? `Thread summary: ${contextSummary}` : undefined,
    draft ? `Active expense draft: ${JSON.stringify(createPromptDraft(draft))}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function createPromptDraft(draft: Doc<'expenseDrafts'>) {
  return {
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    categoryConfidence: draft.categoryConfidence,
    merchant: draft.merchant,
    note: draft.note,
    occurredAt: draft.occurredAt,
    missingFields: draft.missingFields,
    clarificationQuestion: draft.clarificationQuestion,
  };
}
