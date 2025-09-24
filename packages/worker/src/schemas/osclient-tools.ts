import { z } from 'zod';

// Tool execution schemas based on your OS client app capabilities
export const ExecuteScriptSchema = z.object({
  enable_narration: z.boolean().default(true),
  script: z.string().min(1, 'Script content is required'),
  variables: z.record(z.string(), z.unknown()).optional(),
  trace: z.boolean().optional(),
});

export const StartRecordingSchema = z.object({
  // No properties required for starting recording
});

export const StopRecordingSchema = z.object({
  recordingId: z.string().min(1, 'Recording ID is required'),
});

export const GetRecordingSchema = z.object({
  recordingId: z.string().min(1, 'Recording ID is required'),
});

export const AbortScriptSchema = z.object({
  // No parameters required
});

// WebSocket message schemas
export const OSClientToolRequestSchema = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('execute_script'),
    requestId: z.string(),
    params: ExecuteScriptSchema,
  }),
  z.object({
    tool: z.literal('start_recording'),
    requestId: z.string(),
    params: StartRecordingSchema,
  }),
  z.object({
    tool: z.literal('stop_recording'),
    requestId: z.string(),
    params: StopRecordingSchema,
  }),
  z.object({
    tool: z.literal('get_recording'),
    requestId: z.string(),
    params: GetRecordingSchema,
  }),
  z.object({
    tool: z.literal('abort_script'),
    requestId: z.string(),
    params: AbortScriptSchema,
  }),
]);

export const OSClientToolResponseSchema = z.object({
  requestId: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

// Connection management schemas
export const OSClientConnectionEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connect'),
    clientId: z.string(),
  }),
  z.object({
    type: z.literal('disconnect'),
    clientId: z.string(),
  }),
  z.object({
    type: z.literal('tool_request'),
    tool: z.string(),
    requestId: z.string(),
    params: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('tool_response'),
    requestId: z.string(),
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),
]);

// Type exports
export type ExecuteScriptInput = z.infer<typeof ExecuteScriptSchema>;
export type StartRecordingInput = z.infer<typeof StartRecordingSchema>;
export type StopRecordingInput = z.infer<typeof StopRecordingSchema>;
export type GetRecordingInput = z.infer<typeof GetRecordingSchema>;
export type AbortScriptInput = z.infer<typeof AbortScriptSchema>;
export type OSClientToolRequest = z.infer<typeof OSClientToolRequestSchema>;
export type OSClientToolResponse = z.infer<typeof OSClientToolResponseSchema>;
export type OSClientConnectionEvent = z.infer<typeof OSClientConnectionEventSchema>;
