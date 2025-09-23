export type WorkflowSummary = {
  id: string;
  doName: string;
  name?: string;
  type?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkflowVersionHeader = {
  id: string;
  name: string;
  createdAt: number;
  isNamed: boolean;
};

export type WorkflowVersionRecord = WorkflowVersionHeader & {
  document: string;
  code: string;
  seq: number;
};

export type WorkflowDetail = {
  workflowId: string;
  name?: string;
  type?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  document: unknown;
  code: string;
  lastRestoredVersionId: string | null;
  versions: WorkflowVersionHeader[];
};

export type InitializeInput = {
  workflowId: string;
  type?: string;
  name?: string;
  status?: string;
  document: unknown;
  code: string;
};

export type UpdateStateInput = {
  document: unknown;
  code: string;
  type?: string;
  name?: string;
  status?: string;
};

export type SaveVersionInput = {
  document: unknown;
  code: string;
  name?: string;
};

export type RestoreVersionInput = {
  versionId: string;
};

export type RenameVersionInput = {
  versionId: string;
  name: string;
};

export type DeleteVersionInput = {
  versionId: string;
};