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

const KNOWN_ACTION_TYPES: ReadonlySet<TrackedAction['type']> = new Set([
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
]);

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `recording-${Math.random().toString(16).slice(2)}`;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true') {
      return true;
    }
    if (lower === 'false') {
      return false;
    }
  }
  return undefined;
};

const toPoint = (value: unknown): CGPoint | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const point = value as Record<string, unknown>;
    const x = toOptionalNumber(point.x);
    const y = toOptionalNumber(point.y);
    if (x !== undefined && y !== undefined) {
      return { x, y };
    }
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [xRaw, yRaw] = value;
    const x = toOptionalNumber(xRaw);
    const y = toOptionalNumber(yRaw);
    if (x !== undefined && y !== undefined) {
      return { x, y };
    }
  }

  return undefined;
};

const toFrame = (value: unknown): CGRect | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const frame = value as Record<string, unknown>;
    const x = toOptionalNumber(frame.x);
    const y = toOptionalNumber(frame.y);
    const width = toOptionalNumber(frame.width);
    const height = toOptionalNumber(frame.height);
    if (
      x !== undefined &&
      y !== undefined &&
      width !== undefined &&
      height !== undefined
    ) {
      return { x, y, width, height };
    }
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [originRaw, sizeRaw] = value;
    const origin = toPoint(originRaw);
    const sizePoint = toPoint(sizeRaw);
    if (origin && sizePoint) {
      const width = sizePoint.x;
      const height = sizePoint.y;
      if (width !== undefined && height !== undefined) {
        return {
          x: origin.x,
          y: origin.y,
          width,
          height,
        };
      }
    }
  }

  return undefined;
};

const normalizeTrackedElement = (value: unknown): TrackedElement | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const frame = toFrame(raw.frame);

  if (!frame) {
    return undefined;
  }

  const candidate: TrackedElement = {
    role: toOptionalString(raw.role) ?? 'unknown',
    frame,
    title: toOptionalString(raw.title) ?? null,
    identifier: toOptionalString(raw.identifier) ?? null,
  };

  return TrackedElementSchema.parse(candidate);
};

const normalizeTrackedAction = (value: unknown): TrackedAction | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const type = toOptionalString(raw.type);

  if (!type || !KNOWN_ACTION_TYPES.has(type as TrackedAction['type'])) {
    return null;
  }

  const candidate: Partial<TrackedAction> = {
    id: toOptionalString(raw.id) ?? randomId(),
    timestamp: toOptionalString(raw.timestamp) ?? new Date().toISOString(),
    type: type as TrackedAction['type'],
    appName: toOptionalString(raw.appName) ?? undefined,
    windowTitle: toOptionalString(raw.windowTitle) ?? undefined,
    windowUrl: toOptionalString(raw.windowUrl) ?? undefined,
    text: toOptionalString(raw.text) ?? undefined,
    keys: toOptionalString(raw.keys) ?? undefined,
    position: toPoint(raw.position) ?? undefined,
    endPosition: toPoint(raw.endPosition) ?? undefined,
    direction: toOptionalString(raw.direction) ?? undefined,
    duration: toOptionalNumber(raw.duration) ?? undefined,
    element: normalizeTrackedElement(raw.element) ?? undefined,
    screenshotLocalPath: toOptionalString(raw.screenshotLocalPath) ?? undefined,
    screenshotUrl: toOptionalString(raw.screenshotUrl) ?? undefined,
    batchTaskId: toOptionalString(raw.batchTaskId) ?? undefined,
    visionActionDescription: toOptionalString(raw.visionActionDescription) ?? undefined,
    annotatedScreenshotUrl: toOptionalString(raw.annotatedScreenshotUrl) ?? undefined,
    speechTranscript: toOptionalString(raw.speechTranscript) ?? undefined,
    speechStartTime: toOptionalNumber(raw.speechStartTime) ?? undefined,
    speechEndTime: toOptionalNumber(raw.speechEndTime) ?? undefined,
    speechConfidence: toOptionalNumber(raw.speechConfidence) ?? undefined,
  };

  const parsed = TrackedActionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

const normalizeSpeechSegment = (value: unknown): SpeechTranscriptSegment | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const text = toOptionalString(raw.text);
  const startTime = toOptionalNumber(raw.startTime);
  const endTime = toOptionalNumber(raw.endTime);
  const timestamp = toOptionalString(raw.timestamp);

  if (!text || startTime === undefined || endTime === undefined || !timestamp) {
    return null;
  }

  const candidate: SpeechTranscriptSegment = {
    id: toOptionalString(raw.id) ?? randomId(),
    startTime,
    endTime,
    text,
    confidence: toOptionalNumber(raw.confidence) ?? 0,
    isFinal: toOptionalBoolean(raw.isFinal) ?? true,
    timestamp,
  };

  const parsed = SpeechTranscriptSegmentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

const normalizeRecordingOptions = (value: unknown): RecordingOptionsSnapshot | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const clickConcurrencyLimit = toOptionalNumber(raw.clickConcurrencyLimit);
  const verbose = toOptionalBoolean(raw.verbose);
  const includeTranscript = toOptionalBoolean(raw.includeTranscript);

  if (
    clickConcurrencyLimit === undefined ||
    verbose === undefined ||
    includeTranscript === undefined
  ) {
    return null;
  }

  const candidate: RecordingOptionsSnapshot = {
    clickConcurrencyLimit,
    verbose,
    includeTranscript,
  };

  const parsed = RecordingOptionsSnapshotSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

const buildSessionFromRaw = (raw: Record<string, unknown>): RecordingSession | null => {
  const metadata = raw.metadata && typeof raw.metadata === 'object'
    ? (raw.metadata as Record<string, unknown>)
    : undefined;

  const baseActions = Array.isArray(raw.actions)
    ? raw.actions
    : Array.isArray(raw.content)
      ? raw.content
      : metadata && Array.isArray(metadata.actions)
        ? metadata.actions
        : null;

  if (!baseActions) {
    return null;
  }

  const actions: TrackedAction[] = baseActions
    .map(action => normalizeTrackedAction(action))
    .filter((action): action is TrackedAction => action !== null);

  const sessionId = toOptionalString(raw.sessionId)
    ?? (metadata ? toOptionalString(metadata.sessionId) : undefined)
    ?? randomId();

  const startTime = toOptionalString(raw.startTime)
    ?? (metadata ? toOptionalString(metadata.startedAt ?? metadata.startTime) : undefined);

  if (!startTime) {
    return null;
  }

  const endTime = toOptionalString(raw.endTime)
    ?? (metadata ? toOptionalString(metadata.stoppedAt ?? metadata.endTime) : undefined)
    ?? null;

  const recordingOptions = normalizeRecordingOptions(raw.recordingOptions)
    ?? (metadata ? normalizeRecordingOptions(metadata.recordingOptions) : null)
    ?? {
      clickConcurrencyLimit: 1,
      verbose: false,
      includeTranscript: false,
    };

  const speechSegmentsRaw = Array.isArray(raw.speechSegments)
    ? raw.speechSegments
    : metadata && Array.isArray(metadata.speechSegments)
      ? metadata.speechSegments
      : [];

  const speechSegments: SpeechTranscriptSegment[] = speechSegmentsRaw
    .map(segment => normalizeSpeechSegment(segment))
    .filter((segment): segment is SpeechTranscriptSegment => segment !== null);

  const fullTranscript = toOptionalString(raw.fullTranscript)
    ?? (metadata ? toOptionalString(metadata.fullTranscript) : undefined)
    ?? null;

  const audioFilePath = toOptionalString(raw.audioFilePath)
    ?? (metadata ? toOptionalString(metadata.audioFilePath) : undefined)
    ?? null;

  const candidate: RecordingSession = {
    sessionId,
    startTime,
    endTime,
    actions,
    fullTranscript,
    speechSegments,
    audioFilePath,
    recordingOptions,
  };

  const parsed = RecordingSessionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

const buildActionArrayFromRaw = (raw: unknown): TrackedActionArray | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const actions: TrackedAction[] = raw
    .map(entry => normalizeTrackedAction(entry))
    .filter((action): action is TrackedAction => action !== null);

  const parsed = TrackedActionArraySchema.safeParse(actions);
  return parsed.success ? parsed.data : null;
};

export const normalizeRecordingResult = (input: unknown): RecordingResult | null => {
  const direct = RecordingResultSchema.safeParse(input);
  if (direct.success) {
    return direct.data;
  }

  if (!input || typeof input !== 'object') {
    return null;
  }

  const root = input as Record<string, unknown>;

  if ('content' in root) {
    const normalizedContent = normalizeRecordingResult(root.content);
    if (normalizedContent) {
      return normalizedContent;
    }
  }

  const session = buildSessionFromRaw(root);
  if (session) {
    return session;
  }

  const asArray = buildActionArrayFromRaw(input);
  if (asArray) {
    return asArray;
  }

  if ('content' in root) {
    const asArrayContent = buildActionArrayFromRaw(root.content);
    if (asArrayContent) {
      return asArrayContent;
    }
  }

  return null;
};
