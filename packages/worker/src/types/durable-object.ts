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
} from './workflow';

export interface WorkflowDurableObjectStub {
  initialize(input: InitializeInput): Promise<WorkflowDetail>;
  getDetail(): Promise<WorkflowDetail>;
  getSummary(): Promise<WorkflowSummary>;
  updateState(input: UpdateStateInput): Promise<WorkflowDetail>;
  saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader>;
  listVersionHeadersPublic(): Promise<WorkflowVersionHeader[]>;
  restoreVersion(input: RestoreVersionInput): Promise<WorkflowDetail>;
  renameVersion(input: RenameVersionInput): Promise<WorkflowVersionHeader>;
  deleteVersion(input: DeleteVersionInput): Promise<void>;
  deleteWorkflow(): Promise<void>;
}