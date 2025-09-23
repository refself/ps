import { z } from 'zod';

export const CGPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CGRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const RecordingOptionsSnapshotSchema = z.object({
  clickConcurrencyLimit: z.number().int().min(1),
  verbose: z.boolean(),
  includeTranscript: z.boolean(),
});

export const TrackedElementSchema = z.object({
  role: z.string(),
  title: z.string().nullable().optional(),
  frame: CGRectSchema,
  identifier: z.string().nullable().optional(),
});

export const SpeechTranscriptSegmentSchema = z.object({
  id: z.string().uuid(),
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  isFinal: z.boolean(),
  timestamp: z.string().datetime(),
});

export const TrackedActionSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  type: z.enum([
    'click',
    'doubleClick',
    'rightClick',
    'drag',
    'scroll',
    'type',
    'press',
    'wait',
    'openApp',
    'copy',
    'paste',
    'cut',
    'select',
  ]),
  appName: z.string().nullable().optional(),
  windowTitle: z.string().nullable().optional(),
  windowUrl: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  keys: z.string().nullable().optional(),
  position: CGPointSchema.nullable().optional(),
  endPosition: CGPointSchema.nullable().optional(),
  direction: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  element: TrackedElementSchema.nullable().optional(),
  screenshotLocalPath: z.string().nullable().optional(),
  screenshotUrl: z.string().nullable().optional(),
  batchTaskId: z.string().nullable().optional(),
  visionActionDescription: z.string().nullable().optional(),
  annotatedScreenshotUrl: z.string().nullable().optional(),
  speechTranscript: z.string().nullable().optional(),
  speechStartTime: z.number().nullable().optional(),
  speechEndTime: z.number().nullable().optional(),
  speechConfidence: z.number().min(0).max(1).nullable().optional(),
});

export const RecordingSessionSchema = z.object({
  sessionId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  actions: z.array(TrackedActionSchema),
  fullTranscript: z.string().nullable().optional(),
  speechSegments: z.array(SpeechTranscriptSegmentSchema),
  audioFilePath: z.string().nullable().optional(),
  recordingOptions: RecordingOptionsSnapshotSchema,
});

export const TrackedActionArraySchema = z.array(TrackedActionSchema);

export const RecordingResultSchema = z.union([
  RecordingSessionSchema,
  TrackedActionArraySchema,
]);

export type CGPoint = z.infer<typeof CGPointSchema>;
export type CGRect = z.infer<typeof CGRectSchema>;
export type RecordingOptionsSnapshot = z.infer<typeof RecordingOptionsSnapshotSchema>;
export type TrackedElement = z.infer<typeof TrackedElementSchema>;
export type SpeechTranscriptSegment = z.infer<typeof SpeechTranscriptSegmentSchema>;
export type TrackedAction = z.infer<typeof TrackedActionSchema>;
export type RecordingSession = z.infer<typeof RecordingSessionSchema>;
export type TrackedActionArray = z.infer<typeof TrackedActionArraySchema>;
export type RecordingResult = z.infer<typeof RecordingResultSchema>;
