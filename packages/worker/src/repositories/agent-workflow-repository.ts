import { drizzle } from 'drizzle-orm/durable-sqlite';
import { eq, desc } from 'drizzle-orm';
import { versions, recordings } from '@/db/durable-object-schema';
import { MAX_VERSION_HISTORY } from '@/constants';
import type {
  WorkflowVersionHeader,
  WorkflowVersionRecord,
  WorkflowRecording,
} from '@/schemas/workflow-schemas';

type RecordingStatus = WorkflowRecording['status'];

export class AgentWorkflowRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(storage: DurableObjectStorage) {
    this.db = drizzle(storage);
  }

  getDb() {
    return this.db;
  }

  upsertRecording({
    recordingId,
    status,
    data,
    createdAt,
    updatedAt,
    stoppedAt,
    lastError,
  }: WorkflowRecording): void {
    this.db.insert(recordings)
      .values({
        recordingId,
        status,
        data: data ? JSON.stringify(data) : null,
        createdAt,
        updatedAt,
        stoppedAt: stoppedAt ?? null,
        lastError: lastError ?? null,
      })
      .onConflictDoUpdate({
        target: recordings.recordingId,
        set: {
          status,
          data: data ? JSON.stringify(data) : null,
          createdAt,
          updatedAt,
          stoppedAt: stoppedAt ?? null,
          lastError: lastError ?? null,
        },
      })
      .run();
  }

  updateRecording(recordingId: string, update: Partial<WorkflowRecording>): void {
    const payload: Record<string, unknown> = {};

    if (update.status) {
      payload.status = update.status;
    }
    if (update.data !== undefined) {
      payload.data = update.data ? JSON.stringify(update.data) : null;
    }
    if (update.createdAt !== undefined) {
      payload.createdAt = update.createdAt;
    }
    if (update.updatedAt !== undefined) {
      payload.updatedAt = update.updatedAt;
    }
    if (update.stoppedAt !== undefined) {
      payload.stoppedAt = update.stoppedAt ?? null;
    }
    if (update.lastError !== undefined) {
      payload.lastError = update.lastError ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    this.db.update(recordings)
      .set(payload)
      .where(eq(recordings.recordingId, recordingId))
      .run();
  }

  getRecording(recordingId: string): WorkflowRecording | null {
    const row = this.db.select()
      .from(recordings)
      .where(eq(recordings.recordingId, recordingId))
      .get();

    if (!row) {
      return null;
    }

    return this.mapRecordingRow(row);
  }

  listRecordings(): WorkflowRecording[] {
    const rows = this.db.select()
      .from(recordings)
      .orderBy(desc(recordings.createdAt))
      .all();

    return rows.map(row => this.mapRecordingRow(row));
  }

  async listVersionHeaders(limit = MAX_VERSION_HISTORY): Promise<WorkflowVersionHeader[]> {
    const result = this.db.select()
      .from(versions)
      .orderBy(desc(versions.seq))
      .limit(limit)
      .all();

    return result.map(row => {
      const rawName = String(row.name ?? "").trim();
      const createdAt = Number(row.createdAt);
      const fallbackName = `Auto-save ${new Date(createdAt).toLocaleString()}`;
      return {
        id: String(row.id),
        name: rawName.length > 0 ? rawName : fallbackName,
        createdAt,
        isNamed: Boolean(row.isNamed)
      };
    });
  }

  getVersionRecord(versionId: string): WorkflowVersionRecord | null {
    const result = this.db.select()
      .from(versions)
      .where(eq(versions.id, versionId))
      .get();

    if (!result) {
      return null;
    }

    return {
      id: String(result.id),
      seq: Number(result.seq),
      name: String(result.name ?? ""),
      createdAt: Number(result.createdAt),
      document: String(result.document),
      code: String(result.code),
      isNamed: Boolean(result.isNamed)
    };
  }

  insertVersion(record: WorkflowVersionRecord): void {
    this.db.insert(versions)
      .values({
        id: record.id,
        seq: record.seq,
        name: record.name,
        createdAt: record.createdAt,
        document: record.document,
        code: record.code,
        isNamed: record.isNamed ? 1 : 0
      })
      .run();
  }

  getNextSequence(): number {
    const result = this.db.select({ seq: versions.seq })
      .from(versions)
      .orderBy(desc(versions.seq))
      .limit(1)
      .get();

    return Number(result?.seq ?? 0);
  }

  enforceVersionLimit(limit = MAX_VERSION_HISTORY): void {
    const result = this.db.select({ id: versions.id })
      .from(versions)
      .orderBy(desc(versions.seq))
      .all();

    const ids: string[] = result.map(row => String(row.id));

    if (ids.length <= limit) {
      return;
    }

    const removeIds = ids.slice(limit);
    for (const id of removeIds) {
      this.db.delete(versions)
        .where(eq(versions.id, id))
        .run();
    }
  }

  updateVersion({ versionId, name, isNamed }: { versionId: string; name: string; isNamed: boolean }): void {
    this.db.update(versions)
      .set({
        name,
        isNamed: isNamed ? 1 : 0
      })
      .where(eq(versions.id, versionId))
      .run();
  }

  deleteVersion(versionId: string): void {
    this.db.delete(versions)
      .where(eq(versions.id, versionId))
      .run();
  }

  private mapRecordingRow(row: typeof recordings.$inferSelect): WorkflowRecording {
    return {
      recordingId: String(row.recordingId),
      status: row.status as RecordingStatus,
      data: row.data ? JSON.parse(String(row.data)) : undefined,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      stoppedAt: row.stoppedAt === null || row.stoppedAt === undefined ? null : Number(row.stoppedAt),
      lastError: row.lastError === null || row.lastError === undefined ? null : String(row.lastError),
    };
  }
}
