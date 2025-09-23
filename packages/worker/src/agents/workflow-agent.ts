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
} from '../schemas/osclient-tools';
import type {
  WorkflowDetail,
  WorkflowVersionHeader,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput
} from '../schemas/workflow-schemas';

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

  // No WebSocket handlers - all connections go through ConnectionCoordinator

  // Public API methods - focus on state coordination
  // Input is already validated at route level, no need to validate again
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
  async executeScript(userId: string, params: ExecuteScriptInput) {
    const coordinator = await this.getConnectionCoordinator(userId);
    return coordinator.executeScriptForWorkflow(this.name, params);
  }

  async startRecording(userId: string, params: StartRecordingInput = {}): Promise<{ recordingId: string }> {
    const coordinator = await this.getConnectionCoordinator(userId);
    return coordinator.startRecordingForWorkflow(this.name, params);
  }

  async stopRecording(userId: string, params: StopRecordingInput): Promise<any> {
    const coordinator = await this.getConnectionCoordinator(userId);
    return coordinator.stopRecordingForWorkflow(this.name, params);
  }

  async getRecording(userId: string, params: GetRecordingInput): Promise<any> {
    const coordinator = await this.getConnectionCoordinator(userId);
    return coordinator.getRecordingForWorkflow(this.name, params);
  }

  // Helper to get the connection coordinator
  private async getConnectionCoordinator(userId: string): Promise<any> {
    return getAgentByName(this.env.CONNECTION_COORDINATOR, `coordinator:${userId}`);
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
