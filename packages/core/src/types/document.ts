import type { BlockConnection, BlockInstance } from "./block";

export type WorkflowDocumentMetadata = {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  sourcePath?: string;
};

export type WorkflowDocument = {
  id: string;
  root: string;
  blocks: Record<string, BlockInstance>;
  connections: BlockConnection[];
  metadata: WorkflowDocumentMetadata;
  version: number;
};
