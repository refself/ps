import type { WorkflowDocument } from '@workflow-builder/core';

import { request } from './workflow-api';

export type CompanionMessageRole = 'user' | 'assistant' | 'tool';

export type CompanionMessage = {
  id: string;
  role: CompanionMessageRole;
  content: string;
  createdAt: number;
  metadata?: {
    toolName?: string;
    toolInput?: unknown;
    toolResult?: unknown;
    summary?: string;
    codeUpdated?: boolean;
  };
};

export type CompanionHistoryResponse = {
  systemPrompt: string;
  messages: CompanionMessage[];
};

export type CompanionChatResponse = {
  reply: string;
  usedTools: string[];
  messages: CompanionMessage[];
  updatedCode?: string;
  updatedDocument?: WorkflowDocument;
  notes: string[];
};

export const getCompanionHistory = async (workflowId: string): Promise<CompanionHistoryResponse> => {
  return request(`/workflows/${encodeURIComponent(workflowId)}/companion/history`);
};

export const sendCompanionMessage = async (
  workflowId: string,
  message: string
): Promise<CompanionChatResponse> => {
  return request(`/workflows/${encodeURIComponent(workflowId)}/companion/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};

export const resetCompanionHistory = async (workflowId: string): Promise<void> => {
  await request(`/workflows/${encodeURIComponent(workflowId)}/companion/reset`, {
    method: 'POST',
  });
};
