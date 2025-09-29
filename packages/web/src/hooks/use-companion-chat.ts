import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getCompanionHistory,
  resetCompanionHistory,
  sendCompanionMessage,
  type CompanionChatResponse,
  type CompanionMessage,
} from '../services/companion-api';

export type CompanionState = {
  systemPrompt: string;
  messages: CompanionMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  lastReply: string | null;
  lastNotes: string[];
  lastTools: string[];
};

export type UseCompanionChatOptions = {
  workflowId: string | null;
  onWorkflowUpdate?: () => void;
};

const INITIAL_STATE: CompanionState = {
  systemPrompt: '',
  messages: [],
  loading: false,
  sending: false,
  error: null,
  lastReply: null,
  lastNotes: [],
  lastTools: [],
};

export const useCompanionChat = ({ workflowId, onWorkflowUpdate }: UseCompanionChatOptions) => {
  const [state, setState] = useState<CompanionState>(INITIAL_STATE);

  useEffect(() => {
    if (!workflowId) {
      setState(INITIAL_STATE);
      return;
    }

    let cancelled = false;
    (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const history = await getCompanionHistory(workflowId);
        if (cancelled) {
          return;
        }
        setState((prev) => ({
          ...prev,
          systemPrompt: history.systemPrompt,
          messages: history.messages,
          loading: false,
          error: null,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load companion history';
        setState((prev) => ({ ...prev, error: message, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  const applyResponse = useCallback((response: CompanionChatResponse) => {
    setState((prev) => ({
      ...prev,
      messages: response.messages,
      lastReply: response.reply,
      lastNotes: response.notes ?? [],
      lastTools: response.usedTools ?? [],
      sending: false,
    }));

    if (response.updatedCode || response.updatedDocument) {
      onWorkflowUpdate?.();
    }
  }, [onWorkflowUpdate]);

  const sendMessage = useCallback(async (message: string) => {
    if (!workflowId) {
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setState((prev) => ({ ...prev, sending: true, error: null }));

    try {
      const response = await sendCompanionMessage(workflowId, trimmed);
      applyResponse(response);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to send message';
      setState((prev) => ({ ...prev, error: messageText, sending: false }));
    }
  }, [applyResponse, workflowId]);

  const reset = useCallback(async () => {
    if (!workflowId) {
      setState(INITIAL_STATE);
      return;
    }

    setState((prev) => ({ ...prev, loading: true, sending: false, error: null }));
    try {
      await resetCompanionHistory(workflowId);
      const history = await getCompanionHistory(workflowId);
      setState((prev) => ({
        ...prev,
        systemPrompt: history.systemPrompt,
        messages: history.messages,
        loading: false,
        sending: false,
        error: null,
        lastReply: null,
        lastNotes: [],
        lastTools: [],
      }));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to reset companion history';
      setState((prev) => ({ ...prev, loading: false, error: messageText }));
    }
  }, [workflowId]);

  const companionState = useMemo(() => state, [state]);

  return {
    state: companionState,
    sendMessage,
    reset,
  };
};

export type UseCompanionChatReturn = ReturnType<typeof useCompanionChat>;
