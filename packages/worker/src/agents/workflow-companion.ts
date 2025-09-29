import { Agent, getAgentByName } from 'agents';
import { streamText, tool } from 'ai';
import type { LanguageModel } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { apiManifestEntries, importWorkflow } from '@workflow-builder/core';
import { DEFAULT_STATUS, DEFAULT_USER_ID } from '@/constants';
import type {
  CompanionChatResponse,
  CompanionMessage,
  CompanionMessageMetadata,
  CompanionMessageRole,
} from '@/schemas/companion-schemas';
import type { WorkflowDetail } from '@/schemas/workflow-schemas';

type CompanionState = {
  workflowId: string;
  systemPrompt: string;
  messages: CompanionMessage[];
  lastUpdated: number;
};

type WorkflowDetailSnapshot = {
  id: string;
  name?: string;
  status: string;
  code: string;
  document: WorkflowDetail['document'];
  type?: string;
  updatedAt: number;
};

type BuildToolsContext = {
  workflow: WorkflowDetailSnapshot;
  onToolUsed: (name: string) => void;
  onCodeUpdated: (payload: { code: string; summary?: string; document?: WorkflowDetailSnapshot['document'] }) => void;
  onNote: (note: string) => void;
};

type UpdateWorkflowToolResult =
  | { status: 'error'; message: string }
  | { status: 'success'; summary: string };

type RecordingSummaryToolResult =
  | { status: 'error'; recordingId: string; message: string }
  | { status: 'success'; recordingId: string; summary: string; transcript?: string | null };

type CompanionActionSummary = {
  index: number;
  type: string;
  app?: string | null;
  windowTitle?: string | null;
  text?: string | null;
  timestamp: string;
};

type RecordingSummaryData = {
  recordingId: string;
  header: string;
  actions: CompanionActionSummary[];
  transcript?: string | null;
};

const MODEL_NAME = '@cf/qwen/qwen2.5-coder-32b-instruct';
const MAX_HISTORY = 20;

export class WorkflowCompanion extends Agent<Env, CompanionState> {
  initialState: CompanionState = {
    workflowId: '',
    systemPrompt: '',
    messages: [],
    lastUpdated: Date.now(),
  };

  async chat(input: string): Promise<CompanionChatResponse> {
    const workflowId = this.ensureWorkflowId();
    const workflow = await this.getWorkflowSnapshot(workflowId);
    const systemPrompt = await this.ensureSystemPrompt(workflow);

    this.appendToHistory({ role: 'user', content: input });

    const contextSummary = this.buildContextSummary(workflow);
    const systemMessage = [
      systemPrompt,
      'Current workflow context:',
      contextSummary,
    ].join('\n\n');

    const conversation = this.getConversationMessages();

    const usedToolNames = new Set<string>();
    let updatedCode: string | undefined;
    const notes: string[] = [];
    let updatedDocumentPayload: WorkflowDetailSnapshot['document'] | undefined;

    const tools = this.buildTools({
      workflow,
      onToolUsed: (name) => usedToolNames.add(name),
      onCodeUpdated: ({ code, summary, document }) => {
        updatedCode = code;
        workflow.code = code;
        if (document) {
          workflow.document = document;
          updatedDocumentPayload = document;
        }
        workflow.updatedAt = Date.now();
        if (summary && summary.trim().length > 0) {
          notes.push(summary.trim());
        }
      },
      onNote: (note) => {
        if (note && note.trim().length > 0) {
          notes.push(note.trim());
        }
      },
    });

    const workersAIProvider = createWorkersAI({ binding: this.env.AI });

    const model = workersAIProvider(MODEL_NAME) as unknown as LanguageModel;

    const result = await streamText({
      model,
      system: systemMessage,
      messages: conversation,
      tools,
      toolChoice: 'auto',
      temperature: 0.3,
    });

    const toolCalls = await result.toolCalls;
    toolCalls.forEach((call) => usedToolNames.add(call.toolName));

    const generatedText = await result.text;
    const reply = generatedText?.trim()
      ?? 'I was unable to generate a response. Please try rephrasing your request.';

    this.appendToHistory({
      role: 'assistant',
      content: reply,
    });

    return {
      reply,
      usedTools: Array.from(usedToolNames),
      updatedCode,
      updatedDocument: updatedDocumentPayload,
      notes,
      messages: this.state.messages,
    };
  }

  async reset(): Promise<void> {
    this.setState({
      ...this.state,
      messages: [],
      lastUpdated: Date.now(),
    });
  }

  async history(): Promise<{ systemPrompt: string; messages: CompanionMessage[] }> {
    const workflowId = this.ensureWorkflowId();
    const workflow = await this.getWorkflowSnapshot(workflowId);
    const systemPrompt = await this.ensureSystemPrompt(workflow);

    return {
      systemPrompt,
      messages: this.state.messages,
    };
  }

  private ensureWorkflowId(): string {
    if (this.state.workflowId) {
      return this.state.workflowId;
    }
    const segments = this.name.split(':');
    const derived = segments.length > 1 ? segments.slice(1).join(':') : this.name;
    this.setState({
      ...this.state,
      workflowId: derived,
    });
    return derived;
  }

  private async ensureSystemPrompt(detail: WorkflowDetailSnapshot): Promise<string> {
    if (this.state.systemPrompt) {
      return this.state.systemPrompt;
    }
    const prompt = this.buildSystemPrompt(detail);
    this.setState({
      ...this.state,
      systemPrompt: prompt,
    });
    return prompt;
  }

  private appendToHistory(message: { role: CompanionMessageRole; content: string; metadata?: CompanionMessageMetadata }): void {
    const entry: CompanionMessage = {
      id: nanoid(),
      role: message.role,
      content: message.content,
      createdAt: Date.now(),
      metadata: message.metadata,
    };

    const next = [...this.state.messages, entry];
    const capped = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    this.setState({
      ...this.state,
      messages: capped,
      lastUpdated: Date.now(),
    });
  }

  private getConversationMessages(): Array<{ role: 'assistant' | 'user'; content: string }> {
    return this.state.messages
      .filter((message): message is CompanionMessage & { role: 'assistant' | 'user' } =>
        message.role === 'assistant' || message.role === 'user'
      )
      .map((message) => ({ role: message.role, content: message.content }));
  }

  private buildContextSummary(detail: WorkflowDetailSnapshot): string {
    const limitedCode = detail.code.length > 5_000
      ? `${detail.code.slice(0, 5_000)}\n\n// ... truncated`
      : detail.code;

    return [
      `Workflow ID: ${detail.id}`,
      detail.name ? `Name: ${detail.name}` : null,
      `Status: ${detail.status}`,
      detail.type ? `Type: ${detail.type}` : null,
      `Updated At: ${new Date(detail.updatedAt).toISOString()}`,
      `Current script:\n\n${limitedCode}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildSystemPrompt(detail: WorkflowDetailSnapshot): string {
    const manifestSummary = this.buildManifestSummary();
    const languageConstraints = this.buildLanguageConstraints();

    return [
      'You are Reflow Companion, an assistant embedded in the workflow editor.',
      'Your primary goal is to help the user evolve the automation safely and accurately.',
      `The current workflow status is "${detail.status}".`,
      '',
      'When you propose or apply code, you MUST emit valid Reflow script using only the blocks and APIs declared in the manifest summary below. Do not invent namespaces such as "automation.*" or other unlisted helpers.',
      'If the user asks for clipboard summarisation, prefer the `readClipboard` block followed by `stickyNote` to show the summary.',
      'Always return the entire script body when applying changes, and ensure the script parses without syntax errors.',
      '',
      'When the user requests changes, prefer editing the Reflow script using the provided tools. Ensure changes remain consistent with the existing workflow state.',
      'Only update code after you have proposed a complete version. Always return the full script text when performing changes.',
      'If the user references a recording like @recording-id, fetch its details via the recording summary tool before making decisions.',
      '',
      'Language constraints:',
      languageConstraints,
      '',
      'Available API blocks and capabilities:',
      manifestSummary,
      '',
      'General rules:',
      '- Never invent OS automation primitives; stick to documented blocks.',
      '- Prefer deterministic, explicit logic over generic placeholders.',
      '- If unsure about context or the workflow state, ask for clarification before applying destructive updates.',
      '- Summarize changes you apply so the user understands what was modified.',
    ].join('\n');
  }

  private buildManifestSummary(): string {
    const categories = new Map<string, Set<string>>();
    apiManifestEntries.forEach((entry) => {
      const bucket = categories.get(entry.category ?? 'uncategorized') ?? new Set<string>();
      bucket.add(entry.label ?? entry.blockKind);
      categories.set(entry.category ?? 'uncategorized', bucket);
    });

    const summaryLines: string[] = [];
    for (const [category, names] of categories.entries()) {
      const items = Array.from(names).sort().slice(0, 8).join(', ');
      summaryLines.push(`- ${category}: ${items}${names.size > 8 ? ', ...' : ''}`);
    }
    return summaryLines.join('\n');
  }

  private buildLanguageConstraints(): string {
    return [
      '- Reflow is synchronous; no async/await or Promises.',
      '- Only `let` declarations with initializers are allowed. No `var`/`const`.',
      '- Arrays and objects are falsy when empty.',
      '- Logical operators (&&, ||) return booleans, not operands.',
      '- Functions must be declared before use; there is no hoisting.',
      '- No destructuring, spread in object literals, or many modern JS conveniences.',
      '- Use semicolons at statement boundaries.',
    ].join('\n');
  }

  private async getWorkflowSnapshot(workflowId: string): Promise<WorkflowDetailSnapshot> {
    const workflowAgent = await getAgentByName(this.env.WORKFLOW_RUNNER, workflowId);
    const detail = (await workflowAgent.getDetail()) as WorkflowDetail;
    return {
      id: detail.workflowId,
      name: detail.name,
      status: detail.status ?? DEFAULT_STATUS,
      code: detail.code ?? '',
      document: detail.document,
      type: detail.type,
      updatedAt: detail.updatedAt,
    };
  }

  private buildTools(context: BuildToolsContext) {
    const updateWorkflowCode = tool<{ code: string; rationale?: string }, UpdateWorkflowToolResult>({
      description: 'Replace the entire Reflow script for this workflow. Provide the full script and explain the intent.',
      inputSchema: z.object({
        code: z.string().min(1, 'New code must be provided.'),
        rationale: z.string().optional(),
      }),
      execute: async ({ code, rationale }) => {
        context.onToolUsed('update_workflow_code');
        const trimmed = code.trim();
        if (!trimmed) {
          const message = 'New code must be a non-empty string.';
          context.onNote(message);
          const payload: UpdateWorkflowToolResult = { status: 'error', message };
          this.appendToHistory({
            role: 'tool',
            content: message,
            metadata: {
              toolName: 'update_workflow_code',
              summary: message,
            },
          });
          return payload;
        }

        const workflowAgent = await getAgentByName(this.env.WORKFLOW_RUNNER, context.workflow.id);
        let nextDocument = context.workflow.document;
        try {
          nextDocument = importWorkflow({
            code: trimmed,
            name: context.workflow.name ?? 'Workflow',
          });
        } catch (error) {
          console.error('Failed to parse workflow code, reusing existing document.', error);
        }

        await workflowAgent.updateState({
          document: nextDocument,
          code: trimmed,
          name: context.workflow.name,
          status: context.workflow.status,
          type: context.workflow.type,
        });

        context.workflow.document = nextDocument;

        const summary = rationale?.trim() && rationale.trim().length > 0
          ? rationale.trim()
          : 'Updated workflow code based on assistant instructions.';

        context.onCodeUpdated({ code: trimmed, summary, document: nextDocument });

        const payload: UpdateWorkflowToolResult = { status: 'success', summary };
        this.appendToHistory({
          role: 'tool',
          content: summary,
          metadata: {
            toolName: 'update_workflow_code',
            summary,
            codeUpdated: true,
          },
        });

        return payload;
      },
    });

    const fetchRecordingSummary = tool<{ recordingId: string }, RecordingSummaryToolResult>({
      description: 'Fetch a concise summary for a workflow recording by ID. Always use when the user references @recording-id.',
      inputSchema: z.object({
        recordingId: z.string().min(1, 'recordingId is required'),
      }),
      execute: async ({ recordingId }) => {
        context.onToolUsed('fetch_recording_summary');
        const cleaned = recordingId.trim();
        if (!cleaned) {
          const message = 'recordingId is required.';
          context.onNote(message);
          const payload: RecordingSummaryToolResult = { status: 'error', recordingId: cleaned, message };
          this.appendToHistory({
            role: 'tool',
            content: message,
            metadata: {
              toolName: 'fetch_recording_summary',
              summary: message,
            },
          });
          return payload;
        }

        const workflowAgent = await getAgentByName(this.env.WORKFLOW_RUNNER, context.workflow.id);
        const rawResult = await (workflowAgent as any).getRecording(DEFAULT_USER_ID, { recordingId: cleaned }) as unknown;
        const summaryData = this.buildRecordingSummaryFromRaw(cleaned, rawResult);
        if (!summaryData) {
          const message = `Recording ${cleaned} could not be parsed.`;
          context.onNote(message);
          const payload: RecordingSummaryToolResult = { status: 'error', recordingId: cleaned, message };
          this.appendToHistory({
            role: 'tool',
            content: message,
            metadata: {
              toolName: 'fetch_recording_summary',
              summary: message,
            },
          });
          return payload;
        }

        context.onNote(summaryData.header);
        const formatted = this.formatRecordingSummary(summaryData);
        this.appendToHistory({
          role: 'tool',
          content: formatted,
          metadata: {
            toolName: 'fetch_recording_summary',
            summary: summaryData.header,
            toolResult: summaryData,
          },
        });
        const payload: RecordingSummaryToolResult = {
          status: 'success',
          recordingId: cleaned,
          summary: formatted,
          transcript: summaryData.transcript ?? null,
        };
        return payload;
      },
    });

    return {
      update_workflow_code: updateWorkflowCode,
      fetch_recording_summary: fetchRecordingSummary,
    } as const;
  }

  private buildRecordingSummaryFromRaw(recordingId: string, recording: unknown): RecordingSummaryData | null {
    const actions = this.extractRecordingActions(recording);
    if (actions.length === 0) {
      return null;
    }

    const summary = actions.slice(0, 20).map((action, index) => this.summarizeAction(action, index));

    const headerParts = [
      `${actions.length} actions`,
      this.extractFirstString(recording, ['startTime', 'startedAt']),
      this.extractFirstString(recording, ['endTime', 'stoppedAt']) ?? 'still active',
    ].filter(Boolean);

    const transcript = this.extractFirstString(recording, ['fullTranscript']);

    return {
      recordingId,
      header: headerParts.length > 0 ? headerParts.join(', ') : `Recording ${recordingId}`,
      actions: summary,
      transcript: transcript ?? undefined,
    };
  }

  private summarizeAction(action: Record<string, unknown>, index: number): CompanionActionSummary {
    const type = typeof action.type === 'string' ? action.type : 'unknown';
    const appName = typeof action.appName === 'string' ? action.appName : null;
    const windowTitle = typeof action.windowTitle === 'string' ? action.windowTitle : null;
    const text = typeof action.text === 'string'
      ? action.text
      : typeof action.visionActionDescription === 'string'
        ? action.visionActionDescription
        : null;
    const timestamp = typeof action.timestamp === 'string' ? action.timestamp : new Date().toISOString();
    return {
      index,
      type,
      app: appName,
      windowTitle,
      text,
      timestamp,
    };
  }

  private extractRecordingActions(recording: unknown): Array<Record<string, unknown>> {
    if (!recording) {
      return [];
    }
    if (Array.isArray(recording)) {
      return recording.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
    }

    if (typeof recording !== 'object') {
      return [];
    }

    const root = recording as Record<string, unknown>;
    const candidates = [root.actions, root.content];
    if (root.metadata && typeof root.metadata === 'object') {
      const meta = root.metadata as Record<string, unknown>;
      candidates.push(meta.actions, meta.content);
    }

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const filtered = candidate.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }

    return [];
  }

  private extractFirstString(source: unknown, keys: string[]): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }
    const obj = source as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    if (obj.metadata && typeof obj.metadata === 'object') {
      return this.extractFirstString(obj.metadata, keys);
    }
    return null;
  }

  private formatRecordingSummary(summary: RecordingSummaryData): string {
    const actionLines = summary.actions.slice(0, 8).map((action) => {
      const parts: string[] = [`#${action.index + 1}`, action.type.toUpperCase()];
      if (action.app) {
        parts.push(`@${action.app}`);
      }
      if (action.windowTitle) {
        parts.push(`(${action.windowTitle})`);
      }
      if (action.text) {
        parts.push(`→ ${action.text}`);
      }
      return parts.join(' ');
    });

    const lines = [summary.header];
    if (actionLines.length > 0) {
      lines.push('', ...actionLines);
    }
    if (summary.transcript) {
      lines.push('', 'Transcript excerpt:', summary.transcript.slice(0, 400));
    }
    return lines.join('\n');
  }
}
