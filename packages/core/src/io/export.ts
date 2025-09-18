import { generateCode } from "../codegen";
import type { WorkflowDocument } from "../types";

export type ExportWorkflowOptions = {
  document: WorkflowDocument;
};

export const exportWorkflow = ({ document }: ExportWorkflowOptions): string => {
  return generateCode(document);
};
