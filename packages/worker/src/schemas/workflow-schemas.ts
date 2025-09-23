import { z } from 'zod';
import {
  RecordingResultSchema,
  type RecordingResult,
} from './recording-result';

// Base workflow schemas
export const WorkflowSummarySchema = z.object({
  id: z.string(),
  doName: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const WorkflowVersionHeaderSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  isNamed: z.boolean(),
});

export const WorkflowVersionRecordSchema = WorkflowVersionHeaderSchema.extend({
  document: z.string(),
  code: z.string(),
  seq: z.number(),
});

export const WorkflowRecordingSchema = z.object({
  recordingId: z.string(),
  status: z.enum(['recording', 'completed', 'error']),
  data: RecordingResultSchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  stoppedAt: z.number().nullable(),
  lastError: z.string().nullable(),
});

export const WorkflowDetailSchema = z.object({
  workflowId: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  document: z.unknown(),
  code: z.string(),
  lastRestoredVersionId: z.string().nullable(),
  versions: z.array(WorkflowVersionHeaderSchema),
  recordings: z.array(WorkflowRecordingSchema).default([]),
});

// Input schemas for API validation
export const InitializeInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  type: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  document: z.unknown(),
  code: z.string().default(''), // Code can be empty on creation
});

export const UpdateStateInputSchema = z.object({
  document: z.unknown(),
  code: z.string().default(''), // Code can be empty for partial updates
  type: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
});

export const SaveVersionInputSchema = z.object({
  document: z.unknown(),
  code: z.string().default(''), // Code can be empty when saving version
  name: z.string().optional(),
});

export const RestoreVersionInputSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
});

export const RenameVersionInputSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
  name: z.string().min(1, 'Name is required'),
});

export const DeleteVersionInputSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
});

// Query parameter schemas
export const WorkflowListQuerySchema = z.object({
  limit: z.coerce.number().positive().max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Type exports for use throughout the application
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;
export type WorkflowDetail = z.infer<typeof WorkflowDetailSchema>;
export type WorkflowVersionHeader = z.infer<typeof WorkflowVersionHeaderSchema>;
export type WorkflowVersionRecord = z.infer<typeof WorkflowVersionRecordSchema>;
export type WorkflowRecording = z.infer<typeof WorkflowRecordingSchema>;
export type StoredRecordingResult = RecordingResult;
export type InitializeInput = z.infer<typeof InitializeInputSchema>;
export type UpdateStateInput = z.infer<typeof UpdateStateInputSchema>;
export type SaveVersionInput = z.infer<typeof SaveVersionInputSchema>;
export type RestoreVersionInput = z.infer<typeof RestoreVersionInputSchema>;
export type RenameVersionInput = z.infer<typeof RenameVersionInputSchema>;
export type DeleteVersionInput = z.infer<typeof DeleteVersionInputSchema>;
export type WorkflowListQuery = z.infer<typeof WorkflowListQuerySchema>;
