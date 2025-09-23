import { drizzle } from 'drizzle-orm/durable-sqlite';
import { eq, desc } from 'drizzle-orm';
import { workflowMeta, versions } from './durable-object-schema';
import type { WorkflowVersionHeader, WorkflowVersionRecord } from '../types/workflow';
import { MAX_VERSION_HISTORY } from '../constants';

export class WorkflowStorageRepository {
  public db: ReturnType<typeof drizzle>;
  private storage: DurableObjectStorage;

  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
    this.db = drizzle(storage);
  }

  getMetaMap(): Map<string, string> {
    const map = new Map<string, string>();
    try {
      const result = this.db.select().from(workflowMeta).all();
      for (const row of result) {
        map.set(String(row.key), String(row.value));
      }
    } catch (error) {
      // Table might not exist yet, return empty map
      console.warn('workflow_meta table not found, returning empty map');
    }
    return map;
  }

  getMetaValue(key: string): string | undefined {
    const map = this.getMetaMap();
    return map.get(key);
  }

  setMeta(key: string, value: string): void {
    this.db.insert(workflowMeta)
      .values({ key, value })
      .onConflictDoUpdate({
        target: workflowMeta.key,
        set: { value }
      })
      .run();
  }

  deleteMeta(key: string): void {
    this.db.delete(workflowMeta)
      .where(eq(workflowMeta.key, key))
      .run();
  }

  parseNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
      return fallback;
    }
    return value === "1" || value.toLowerCase() === "true";
  }

  parseJson<T>(value: string | undefined): T | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  listVersionHeaders(limit = MAX_VERSION_HISTORY): WorkflowVersionHeader[] {
    const result = this.db.select()
      .from(versions)
      .orderBy(desc(versions.seq))
      .limit(limit)
      .all();

    const versionHeaders: WorkflowVersionHeader[] = [];
    for (const row of result) {
      const rawName = String(row.name ?? "").trim();
      const createdAt = Number(row.createdAt);
      const fallbackName = `Auto-save ${new Date(createdAt).toLocaleString()}`;
      versionHeaders.push({
        id: String(row.id),
        name: rawName.length > 0 ? rawName : fallbackName,
        createdAt,
        isNamed: this.parseBool(row.isNamed?.toString(), false)
      });
    }
    return versionHeaders;
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
      isNamed: this.parseBool(result.isNamed?.toString(), false)
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

  enforceVersionLimit(limit: number): void {
    const result = this.db.select({ id: versions.id })
      .from(versions)
      .orderBy(desc(versions.seq))
      .all();

    const ids: string[] = result.map(row => String(row.id));

    if (ids.length <= limit) {
      return;
    }

    const removeIds = ids.slice(limit);
    if (removeIds.length === 0) {
      return;
    }

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

  getNextSequence(): number {
    const result = this.db.select({ seq: versions.seq })
      .from(versions)
      .orderBy(desc(versions.seq))
      .limit(1)
      .get();

    return Number(result?.seq ?? 0);
  }

  async deleteAll(): Promise<void> {
    await this.storage.deleteAll();
  }
}