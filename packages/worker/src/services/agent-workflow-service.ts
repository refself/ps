import { AgentWorkflowRepository } from '@/repositories/agent-workflow-repository';
import { WorkflowIndexRepository } from '@/repositories/workflow-index';
import { deriveNameFromDocument } from '@/utils/workflow';
import { DEFAULT_STATUS, MAX_VERSION_HISTORY } from '@/constants';
import type {
  WorkflowDetail,
  WorkflowVersionHeader,
  WorkflowVersionRecord,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
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

export class AgentWorkflowService {
  private workflowRepo: AgentWorkflowRepository;
  private indexRepo: WorkflowIndexRepository;
  private agentName: string;

  constructor({ workflowRepo, indexRepo, agentName }: {
    workflowRepo: AgentWorkflowRepository;
    indexRepo: WorkflowIndexRepository;
    agentName: string;
  }) {
    this.workflowRepo = workflowRepo;
    this.indexRepo = indexRepo;
    this.agentName = agentName;
  }

  async initializeWorkflow({ input, currentState }: {
    input: InitializeInput;
    currentState: WorkflowState;
  }): Promise<{ newState: WorkflowState; detail: WorkflowDetail }> {
    const now = Date.now();
    const derivedName = input.name ?? deriveNameFromDocument(input.document);

    const newState: WorkflowState = {
      workflowId: input.workflowId,
      name: derivedName,
      type: input.type,
      status: input.status ?? DEFAULT_STATUS,
      document: input.document,
      code: input.code,
      createdAt: currentState.createdAt || now,
      updatedAt: now,
    };

    await this.updateGlobalIndex(newState);
    const detail = await this.buildDetail(newState);

    return { newState, detail };
  }

  async updateWorkflowState({ input, currentState }: {
    input: UpdateStateInput;
    currentState: WorkflowState;
  }): Promise<{ newState: WorkflowState; detail: WorkflowDetail }> {
    const now = Date.now();
    const derivedName = input.name ?? deriveNameFromDocument(input.document);

    const newState: WorkflowState = {
      ...currentState,
      document: input.document,
      code: input.code,
      type: input.type ?? currentState.type,
      name: derivedName ?? currentState.name,
      status: input.status ?? currentState.status,
      updatedAt: now,
    };

    await this.updateGlobalIndex(newState);
    const detail = await this.buildDetail(newState);

    return { newState, detail };
  }

  async saveWorkflowVersion({ input, currentState }: {
    input: SaveVersionInput;
    currentState: WorkflowState;
  }): Promise<{ newState: WorkflowState; version: WorkflowVersionHeader }> {
    const now = Date.now();
    const nextSeq = this.workflowRepo.getNextSequence() + 1;

    const trimmed = input.name?.trim();
    const label = trimmed && trimmed.length > 0
      ? trimmed
      : `Auto-save ${new Date(now).toLocaleString()}`;
    const isNamed = Boolean(trimmed && trimmed.length > 0);

    const versionId = crypto.randomUUID();

    const record: WorkflowVersionRecord = {
      id: versionId,
      seq: nextSeq,
      name: label,
      createdAt: now,
      document: JSON.stringify(input.document),
      code: input.code,
      isNamed
    };

    this.workflowRepo.insertVersion(record);
    this.workflowRepo.enforceVersionLimit();

    const newState: WorkflowState = {
      ...currentState,
      lastRestoredVersionId: versionId,
      updatedAt: now,
    };

    await this.updateGlobalIndex(newState);

    return {
      newState,
      version: {
        id: versionId,
        name: label,
        createdAt: now,
        isNamed
      }
    };
  }

  async restoreWorkflowVersion({ versionId, currentState }: {
    versionId: string;
    currentState: WorkflowState;
  }): Promise<{ newState: WorkflowState; detail: WorkflowDetail }> {
    const record = this.workflowRepo.getVersionRecord(versionId);
    if (!record) {
      throw new Error("Version not found");
    }

    const document = JSON.parse(record.document);

    const newState: WorkflowState = {
      ...currentState,
      document,
      code: record.code,
      lastRestoredVersionId: versionId,
      updatedAt: Date.now(),
    };

    await this.updateGlobalIndex(newState);
    const detail = await this.buildDetail(newState);

    return { newState, detail };
  }

  async renameWorkflowVersion({ versionId, name }: RenameVersionInput): Promise<WorkflowVersionHeader> {
    const record = this.workflowRepo.getVersionRecord(versionId);
    if (!record) {
      throw new Error("Version not found");
    }

    const trimmed = name.trim();
    const label = trimmed.length > 0 ? trimmed : (record.name || "");
    const isNamed = trimmed.length > 0;

    this.workflowRepo.updateVersion({ versionId, name: label, isNamed });

    return {
      id: versionId,
      name: label,
      createdAt: record.createdAt,
      isNamed
    };
  }

  async deleteWorkflowVersion({ versionId, currentState }: {
    versionId: string;
    currentState: WorkflowState;
  }): Promise<WorkflowState | null> {
    this.workflowRepo.deleteVersion(versionId);

    if (currentState.lastRestoredVersionId === versionId) {
      return {
        ...currentState,
        lastRestoredVersionId: undefined,
      };
    }

    return null; // No state change needed
  }

  async deleteEntireWorkflow(workflowId: string): Promise<void> {
    await this.indexRepo.remove(workflowId);
  }

  async getVersionHeaders(): Promise<WorkflowVersionHeader[]> {
    return this.workflowRepo.listVersionHeaders();
  }

  async buildWorkflowDetail(state: WorkflowState): Promise<WorkflowDetail> {
    return this.buildDetail(state);
  }

  // Private helper methods
  private async buildDetail(state: WorkflowState): Promise<WorkflowDetail> {
    const versions = await this.workflowRepo.listVersionHeaders();

    return {
      workflowId: state.workflowId || this.agentName,
      name: state.name,
      type: state.type,
      status: state.status,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      document: state.document,
      code: state.code,
      lastRestoredVersionId: state.lastRestoredVersionId || null,
      versions,
    };
  }

  private async updateGlobalIndex(state: WorkflowState): Promise<void> {
    await this.indexRepo.upsert({
      id: state.workflowId || this.agentName,
      doName: this.agentName,
      name: state.name,
      type: state.type,
      status: state.status,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });
  }
}
