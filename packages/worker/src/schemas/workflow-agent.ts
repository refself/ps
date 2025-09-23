import type {
  WorkflowDetail,
  WorkflowVersionHeader,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput
} from './workflow-schemas';
import type {
  ExecuteScriptInput,
  StartRecordingInput,
  StopRecordingInput,
  GetRecordingInput,
} from './osclient-tools';

export interface WorkflowAgentMethods {
  // Workflow management methods
  initialize(input: InitializeInput): Promise<WorkflowDetail>;
  getDetail(): Promise<WorkflowDetail>;
  updateState(input: UpdateStateInput): Promise<WorkflowDetail>;
  saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader>;
  listVersionHeaders(): Promise<WorkflowVersionHeader[]>;
  restoreVersion(input: RestoreVersionInput): Promise<WorkflowDetail>;
  renameVersion(input: RenameVersionInput): Promise<WorkflowVersionHeader>;
  deleteVersion(input: DeleteVersionInput): Promise<void>;
  deleteWorkflow(): Promise<void>;

  // OS Client tool methods
  executeScript(params: ExecuteScriptInput): Promise<any>;
  startRecording(params?: StartRecordingInput): Promise<{ recordingId: string }>;
  stopRecording(params: StopRecordingInput): Promise<any>;
  getRecording(params: GetRecordingInput): Promise<any>;
}