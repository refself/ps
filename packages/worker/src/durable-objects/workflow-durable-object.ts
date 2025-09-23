import { DurableObject } from "cloudflare:workers";
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { WorkflowStorageRepository } from '../repositories/workflow-storage';
import { WorkflowIndexRepository } from '../repositories/workflow-index';
import { WorkflowService } from '../services/workflow-service';
import migrations from '../../drizzle/durable-object/migrations';
import type {
  WorkflowDetail,
  WorkflowSummary,
  WorkflowVersionHeader,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput
} from '../types/workflow';

export class WorkflowDurableObject extends DurableObject<Env> {
  private workflowService: WorkflowService;
  private storageRepo: WorkflowStorageRepository;
  private indexRepo: WorkflowIndexRepository;
  private migrationsRun = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.storageRepo = new WorkflowStorageRepository(ctx.storage);
    this.indexRepo = new WorkflowIndexRepository(env.WORKFLOW_INDEX);

    this.workflowService = new WorkflowService({
      storage: this.storageRepo,
      indexRepo: this.indexRepo,
      ctxId: ctx.id.name ?? ctx.id.toString()
    });
  }

  private async ensureMigrations(): Promise<void> {
    if (this.migrationsRun) {
      return;
    }

    try {
      migrate(this.storageRepo.db, migrations);
      this.migrationsRun = true;
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  async initialize(input: InitializeInput): Promise<WorkflowDetail> {
    await this.ensureMigrations();
    return this.workflowService.initialize(input);
  }

  async getDetail(): Promise<WorkflowDetail> {
    await this.ensureMigrations();
    return this.workflowService.getDetail();
  }

  async getSummary(): Promise<WorkflowSummary> {
    await this.ensureMigrations();
    return this.workflowService.getSummary();
  }

  async updateState(input: UpdateStateInput): Promise<WorkflowDetail> {
    await this.ensureMigrations();
    return this.workflowService.updateState(input);
  }

  async saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader> {
    await this.ensureMigrations();
    return this.workflowService.saveVersion(input);
  }

  async listVersionHeadersPublic(): Promise<WorkflowVersionHeader[]> {
    await this.ensureMigrations();
    const detail = await this.workflowService.getDetail();
    return detail.versions;
  }

  async restoreVersion(input: RestoreVersionInput): Promise<WorkflowDetail> {
    await this.ensureMigrations();
    return this.workflowService.restoreVersion(input);
  }

  async renameVersion(input: RenameVersionInput): Promise<WorkflowVersionHeader> {
    await this.ensureMigrations();
    return this.workflowService.renameVersion(input);
  }

  async deleteVersion(input: DeleteVersionInput): Promise<void> {
    await this.ensureMigrations();
    return this.workflowService.deleteVersion(input);
  }

  async deleteWorkflow(): Promise<void> {
    await this.ensureMigrations();
    return this.workflowService.deleteWorkflow();
  }
}