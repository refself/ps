import { Agent } from 'agents';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { AgentWorkflowRepository } from '@/repositories/agent-workflow-repository';
import { WorkflowIndexRepository } from '@/repositories/workflow-index';
import { AgentWorkflowService } from '@/services/agent-workflow-service';
import migrations from '../../drizzle/durable-object/migrations';
import { DEFAULT_STATUS } from '@/constants';
import { getAgentByName } from 'agents';
import type {
  ExecuteScriptInput,
  StartRecordingInput,
  StopRecordingInput,
  GetRecordingInput,
} from '@/schemas/osclient-tools';
import {
  RecordingResultSchema,
} from '@/schemas/recording-result';
import type {
  WorkflowDetail,
  WorkflowVersionHeader,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput,
  WorkflowRecording,
} from '@/schemas/workflow-schemas';

interface WorkflowState {
  workflowId: string;
  name?: string;
  type?: string;
  status: string;
  document: unknown;
  code: string;
  createdAt: number;
  updatedAt: number;
  lastRestoredVersionId?: string;
}

type RecordingStatus = WorkflowRecording['status'];

export class WorkflowAgent extends Agent<Env, WorkflowState> {
  private workflowRepo: AgentWorkflowRepository;
  private workflowService: AgentWorkflowService;

  initialState: WorkflowState = {
    workflowId: '',
    status: DEFAULT_STATUS,
    document: {},
    code: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.workflowRepo = new AgentWorkflowRepository(ctx.storage);
    const indexRepo = new WorkflowIndexRepository(env.WORKFLOW_INDEX);
    this.workflowService = new AgentWorkflowService({
      workflowRepo: this.workflowRepo,
      indexRepo,
      agentName: ctx.id.name ?? ctx.id.toString()
    });

    ctx.blockConcurrencyWhile(async () => {
        try {
          migrate(this.workflowRepo.getDb(), migrations);
        } catch (error) {
          console.error('Failed to run migrations:', error);
          throw error;
      }
    });
  }

  async onStart() {
    console.log(`Workflow agent ${this.name} started`);
  }

  async initialize(input: InitializeInput): Promise<WorkflowDetail> {
    const { newState, detail } = await this.workflowService.initializeWorkflow({
      input,
      currentState: this.state
    });

    this.setState(newState);
    return detail;
  }

  async getDetail(): Promise<WorkflowDetail> {
    return this.workflowService.buildWorkflowDetail(this.state);
  }

  async updateState(input: UpdateStateInput): Promise<WorkflowDetail> {
    const { newState, detail } = await this.workflowService.updateWorkflowState({
      input,
      currentState: this.state
    });

    this.setState(newState);
    return detail;
  }

  async saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader> {
    const { newState, version } = await this.workflowService.saveWorkflowVersion({
      input,
      currentState: this.state
    });

    this.setState(newState);
    return version;
  }

  async listVersionHeaders(): Promise<WorkflowVersionHeader[]> {
    return this.workflowService.getVersionHeaders();
  }

  async restoreVersion(input: RestoreVersionInput): Promise<WorkflowDetail> {
    const { newState, detail } = await this.workflowService.restoreWorkflowVersion({
      versionId: input.versionId,
      currentState: this.state
    });

    this.setState(newState);
    return detail;
  }

  async renameVersion(input: RenameVersionInput): Promise<WorkflowVersionHeader> {
    return this.workflowService.renameWorkflowVersion(input);
  }

  async deleteVersion(input: DeleteVersionInput): Promise<void> {
    const newState = await this.workflowService.deleteWorkflowVersion({
      versionId: input.versionId,
      currentState: this.state
    });

    if (newState) {
      this.setState(newState);
    }
  }

  async deleteWorkflow(): Promise<void> {
    const workflowId = this.state.workflowId || this.name;
    await this.workflowService.deleteEntireWorkflow(workflowId);
    await this.ctx.storage.deleteAll();
  }

  // OS Client tool execution methods - delegate to coordinator
  async executeScript(userId: string, params: Partial<ExecuteScriptInput> = {}) {
    const coordinator = await this.getConnectionCoordinator(userId);
    const script = typeof this.state.code === 'string' ? this.state.code : '';

    if (!script.trim()) {
      throw new Error('Workflow has no code to execute');
    }

    const payload: ExecuteScriptInput = {
      script,
      enable_narration: params.enable_narration ?? true,
    };

    if (typeof params.trace === 'boolean') {
      payload.trace = params.trace;
    }

    if (params.variables && Object.keys(params.variables).length > 0) {
      payload.variables = params.variables;
    }

    return coordinator.executeScriptForWorkflow(this.name, payload);
  }

  async startRecording(userId: string, params: StartRecordingInput = {}): Promise<{ recordingId: string }> {
    const coordinator = await this.getConnectionCoordinator(userId);
    const result = await coordinator.startRecordingForWorkflow(this.name, params);

    const summary = this.extractRecordingSnapshot(result);
    const recordingId = summary.recordingId;

    if (recordingId) {
      const existing = this.workflowRepo.getRecording(recordingId);
      const now = Date.now();
      const createdAt = summary.startedAtMs ?? existing?.createdAt ?? now;
      const record: WorkflowRecording = {
        recordingId,
        status: summary.status ?? 'recording',
        createdAt,
        updatedAt: now,
        stoppedAt: existing?.stoppedAt ?? null,
        lastError: null,
      };

      if (existing?.data) {
        record.data = existing.data;
      }

      this.workflowRepo.upsertRecording(record);
    }

    return result;
  }

  async stopRecording(userId: string, params: StopRecordingInput): Promise<any> {
    const coordinator = await this.getConnectionCoordinator(userId);
    const now = Date.now();
    const recordingId = params.recordingId;

    try {
      const result = await coordinator.stopRecordingForWorkflow(this.name, params);
      const summary = this.extractRecordingSnapshot(result);
      const targetId = summary.recordingId ?? recordingId;

      if (targetId) {
        const stoppedAt = summary.stoppedAtMs ?? now;
        const updates: Partial<WorkflowRecording> = {
          status: summary.status ?? 'completed',
          updatedAt: now,
          stoppedAt,
          lastError: null,
        };

        const parsedResult = RecordingResultSchema.safeParse(result);
        if (parsedResult.success) {
          updates.data = parsedResult.data;
        } else if (result && typeof result === 'object' && 'content' in (result as Record<string, unknown>)) {
          const contentParsed = RecordingResultSchema.safeParse((result as { content?: unknown }).content);
          if (contentParsed.success) {
            updates.data = contentParsed.data;
          }
        }

        this.workflowRepo.updateRecording(targetId, updates);
      }

      return result;
    } catch (error) {
      if (recordingId) {
        this.workflowRepo.updateRecording(recordingId, {
          status: 'error',
          updatedAt: now,
          lastError: this.extractErrorMessage(error),
        });
      }
      throw error;
    }
  }

  async listRecordings(): Promise<WorkflowRecording[]> {
    return this.workflowRepo.listRecordings();
  }

  async getRecording(userId: string, params: GetRecordingInput): Promise<any> {
    const coordinator = await this.getConnectionCoordinator(userId);
    const recordingId = params.recordingId;
    const now = Date.now();

    try {
      const result = await coordinator.getRecordingForWorkflow(this.name, params);

      if (recordingId) {
        const parsed = RecordingResultSchema.safeParse(result);

        if (!parsed.success) {
          const message = 'Invalid recording result format';
          this.workflowRepo.updateRecording(recordingId, {
            status: 'error',
            updatedAt: now,
            lastError: message,
          });
          throw new Error(message);
        }

        this.workflowRepo.updateRecording(recordingId, {
          status: 'completed',
          updatedAt: now,
          stoppedAt: now,
          data: parsed.data,
          lastError: null,
        });

        return parsed.data;
      }

      return result;
    } catch (error) {
      if (recordingId) {
        this.workflowRepo.updateRecording(recordingId, {
          status: 'error',
          updatedAt: now,
          lastError: this.extractErrorMessage(error),
        });
      }

      throw error;
    }
  }

  // Helper to get the connection coordinator
  private async getConnectionCoordinator(userId: string): Promise<any> {
    return getAgentByName(this.env.CONNECTION_COORDINATOR, `coordinator:${userId}`);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch (_err) {
      return String(error);
    }
  }

  private extractRecordingSnapshot(result: unknown): {
    recordingId?: string;
    status?: RecordingStatus;
    startedAtMs?: number;
    stoppedAtMs?: number | null;
  } {
    if (!result || typeof result !== 'object') {
      return {};
    }

    const snapshot: {
      recordingId?: string;
      status?: RecordingStatus;
      startedAtMs?: number;
      stoppedAtMs?: number | null;
    } = {};

    const root = result as Record<string, unknown>;

    if (typeof root.recordingId === 'string') {
      snapshot.recordingId = root.recordingId;
    }

    if (this.isRecordingStatus(root.status)) {
      snapshot.status = root.status;
    }

    if (root.startedAt !== undefined) {
      const startedAt = this.parseTimestamp(root.startedAt);
      if (startedAt !== undefined) {
        snapshot.startedAtMs = startedAt;
      }
    }

    if (root.stoppedAt !== undefined) {
      const stoppedAt = this.parseTimestamp(root.stoppedAt);
      if (stoppedAt !== undefined) {
        snapshot.stoppedAtMs = stoppedAt;
      }
    }

    if (root.metadata && typeof root.metadata === 'object') {
      const metadata = root.metadata as Record<string, unknown>;

      if (typeof metadata.recordingId === 'string') {
        snapshot.recordingId = snapshot.recordingId ?? metadata.recordingId;
      }

      if (this.isRecordingStatus(metadata.status)) {
        snapshot.status = metadata.status;
      }

      if (metadata.startedAt !== undefined) {
        const startedAt = this.parseTimestamp(metadata.startedAt);
        if (startedAt !== undefined) {
          snapshot.startedAtMs = startedAt;
        }
      }

      if (metadata.stoppedAt !== undefined) {
        const stoppedAt = this.parseTimestamp(metadata.stoppedAt);
        if (stoppedAt !== undefined) {
          snapshot.stoppedAtMs = stoppedAt;
        }
      }
    }

    return snapshot;
  }

  private parseTimestamp(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private isRecordingStatus(value: unknown): value is RecordingStatus {
    if (typeof value !== 'string') {
      return false;
    }
    return value === 'recording' || value === 'completed' || value === 'error';
  }

  // Agent lifecycle hooks
  onStateUpdate(state: WorkflowState, source: "server" | any) {
    console.log(`Workflow ${this.name} state updated:`, {
      workflowId: state.workflowId,
      status: state.status,
      updatedAt: state.updatedAt,
      source: source === "server" ? "server" : "client"
    });
  }
}
