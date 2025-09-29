import { z } from 'zod';

export const CompanionMessageRoleSchema = z.enum(['user', 'assistant', 'tool']);

export const CompanionMessageMetadataSchema = z.object({
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolResult: z.unknown().optional(),
  summary: z.string().optional(),
  codeUpdated: z.boolean().optional(),
});

export const CompanionMessageSchema = z.object({
  id: z.string(),
  role: CompanionMessageRoleSchema,
  content: z.string(),
  createdAt: z.number(),
  metadata: CompanionMessageMetadataSchema.optional(),
});

export const CompanionChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export const CompanionResetRequestSchema = z.object({
  reason: z.string().optional(),
});

export const CompanionChatResponseSchema = z.object({
  reply: z.string(),
  usedTools: z.array(z.string()),
  messages: z.array(CompanionMessageSchema),
  updatedCode: z.string().optional(),
  updatedDocument: z.unknown().optional(),
  notes: z.array(z.string()).default([]),
});

export const CompanionHistoryResponseSchema = z.object({
  systemPrompt: z.string(),
  messages: z.array(CompanionMessageSchema),
});

export type CompanionMessageRole = z.infer<typeof CompanionMessageRoleSchema>;
export type CompanionMessageMetadata = z.infer<typeof CompanionMessageMetadataSchema>;
export type CompanionMessage = z.infer<typeof CompanionMessageSchema>;
export type CompanionChatRequest = z.infer<typeof CompanionChatRequestSchema>;
export type CompanionChatResponse = z.infer<typeof CompanionChatResponseSchema>;
export type CompanionHistoryResponse = z.infer<typeof CompanionHistoryResponseSchema>;
