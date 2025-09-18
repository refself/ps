import type { WorkflowDocument } from "../types";
import { parseWorkflow } from "../parsing/parser";

export type ImportWorkflowOptions = {
  code: string;
  name?: string;
  sourcePath?: string;
};

export const importWorkflow = (options: ImportWorkflowOptions): WorkflowDocument => {
  return parseWorkflow(options);
};
