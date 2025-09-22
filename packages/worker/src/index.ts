import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "Content-Type": "application/json"
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400"
};

const JSON_CORS_HEADERS = {
  ...CORS_HEADERS,
  ...JSON_HEADERS
};

const DEFAULT_STATUS = "idle";
const MAX_VERSION_HISTORY = 50;

let indexTableEnsured = false;

async function ensureIndexTable(env: Env): Promise<void> {
  if (indexTableEnsured) {
    return;
  }
  await env.WORKFLOW_INDEX.prepare(
    `CREATE TABLE IF NOT EXISTS workflows_index (
      id TEXT PRIMARY KEY,
      do_name TEXT NOT NULL,
      name TEXT,
      type TEXT,
      status TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  ).run();
  indexTableEnsured = true;
}

async function removeFromIndex(env: Env, workflowId: string): Promise<void> {
  await ensureIndexTable(env);
  await env.WORKFLOW_INDEX.prepare(`DELETE FROM workflows_index WHERE id = ?`).bind(workflowId).run();
}

async function upsertIndex(env: Env, summary: WorkflowSummary): Promise<void> {
  await ensureIndexTable(env);
  await env.WORKFLOW_INDEX.prepare(
    `INSERT INTO workflows_index (id, do_name, name, type, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       status = excluded.status,
       updated_at = excluded.updated_at`
  )
    .bind(
      summary.id,
      summary.doName,
      summary.name ?? null,
      summary.type ?? null,
      summary.status,
      summary.createdAt,
      summary.updatedAt
    )
    .run();
}

async function readJson<T>(request: Request): Promise<T> {
  const raw = await request.text();
  if (!raw) {
    return {} as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: JSON_CORS_HEADERS
    });
  }
}

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...JSON_CORS_HEADERS,
      ...(init?.headers ?? {})
    }
  });
}

function methodNotAllowed(): Response {
  return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
}

function notFound(message = "Not Found"): Response {
  return jsonResponse({ error: message }, { status: 404 });
}

const toIso = (value: number) => new Date(value).toISOString();

const deriveNameFromDocument = (document: unknown): string | undefined => {
  if (document && typeof document === "object" && "metadata" in document) {
    const metadata = (document as Record<string, unknown>).metadata;
    if (metadata && typeof metadata === "object" && "name" in metadata) {
      const name = (metadata as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim().length > 0) {
        return name.trim();
      }
    }
  }
  return undefined;
};

type WorkflowSummary = {
  id: string;
  doName: string;
  name?: string;
  type?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

type WorkflowVersionHeader = {
  id: string;
  name: string;
  createdAt: number;
  isNamed: boolean;
};

type WorkflowVersionRecord = WorkflowVersionHeader & {
  document: string;
  code: string;
  seq: number;
};

type WorkflowDetail = {
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

type InitializeInput = {
  workflowId: string;
  type?: string;
  name?: string;
  status?: string;
  document: unknown;
  code: string;
};

type UpdateStateInput = {
  document: unknown;
  code: string;
  type?: string;
  name?: string;
  status?: string;
};

type SaveVersionInput = {
  document: unknown;
  code: string;
  name?: string;
};

type RestoreVersionInput = {
  versionId: string;
};

type RenameVersionInput = {
  versionId: string;
  name: string;
};

type DeleteVersionInput = {
  versionId: string;
};

export class WorkflowDurableObject extends DurableObject<Env> {
  private readonly sql = this.ctx.storage.sql;
  private schemaReady = false;

  private ensureSchema(): void {
    if (this.schemaReady) {
      return;
    }
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS workflow_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        seq INTEGER NOT NULL,
        name TEXT,
        created_at INTEGER NOT NULL,
        document TEXT NOT NULL,
        code TEXT NOT NULL,
        is_named INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS versions_seq_idx ON versions(seq DESC);`
    );
    this.schemaReady = true;
  }

  private getMetaMap(): Map<string, string> {
    this.ensureSchema();
    const cursor = this.sql.exec(`SELECT key, value FROM workflow_meta`);
    const map = new Map<string, string>();
    for (const row of cursor) {
      map.set(String(row.key), String(row.value));
    }
    return map;
  }

  private getMetaValue(key: string): string | undefined {
    const map = this.getMetaMap();
    return map.get(key);
  }

  private setMeta(key: string, value: string): void {
    this.ensureSchema();
    this.sql.exec(
      `INSERT INTO workflow_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  }

  private deleteMeta(key: string): void {
    this.ensureSchema();
    this.sql.exec(`DELETE FROM workflow_meta WHERE key = ?`, key);
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
      return fallback;
    }
    return value === "1" || value.toLowerCase() === "true";
  }

  private parseJson<T>(value: string | undefined): T | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  private listVersionHeaders(limit = MAX_VERSION_HISTORY): WorkflowVersionHeader[] {
    this.ensureSchema();
    const cursor = this.sql.exec(
      `SELECT id, name, created_at, is_named
       FROM versions
       ORDER BY seq DESC
       LIMIT ?`,
      limit
    );
    const versions: WorkflowVersionHeader[] = [];
    for (const row of cursor) {
      const rawName = String(row.name ?? "").trim();
      const createdAt = Number(row.created_at);
      const fallbackName = `Auto-save ${new Date(createdAt).toLocaleString()}`;
      versions.push({
        id: String(row.id),
        name: rawName.length > 0 ? rawName : fallbackName,
        createdAt,
        isNamed: this.parseBool(row.is_named?.toString(), false)
      });
    }
    return versions;
  }

  private getVersionRecord(versionId: string): WorkflowVersionRecord | null {
    this.ensureSchema();
    const row = this.sql
      .exec(
        `SELECT id, seq, name, created_at, document, code, is_named
         FROM versions
         WHERE id = ?`,
        versionId
      )
      .toArray()[0];
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      seq: Number(row.seq),
      name: String(row.name ?? ""),
      createdAt: Number(row.created_at),
      document: String(row.document),
      code: String(row.code),
      isNamed: this.parseBool(row.is_named?.toString(), false)
    };
  }

  private insertVersion(record: WorkflowVersionRecord): void {
    this.ensureSchema();
    this.sql.exec(
      `INSERT INTO versions (id, seq, name, created_at, document, code, is_named)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.seq,
      record.name,
      record.createdAt,
      record.document,
      record.code,
      record.isNamed ? 1 : 0
    );
  }

  private enforceVersionLimit(limit: number): void {
    const cursor = this.sql.exec(
      `SELECT id FROM versions ORDER BY seq DESC`
    );
    const ids: string[] = [];
    for (const row of cursor) {
      ids.push(String(row.id));
    }
    if (ids.length <= limit) {
      return;
    }
    const removeIds = ids.slice(limit);
    if (removeIds.length === 0) {
      return;
    }
    const placeholders = removeIds.map(() => "?").join(",");
    this.sql.exec(`DELETE FROM versions WHERE id IN (${placeholders})`, ...removeIds);
  }

  private buildSummaryFromMeta(map: Map<string, string>): WorkflowSummary {
    const workflowId = map.get("workflow_id") ?? this.ctx.id.name ?? this.ctx.id.toString();
    const createdAt = this.parseNumber(map.get("created_at"), Date.now());
    const updatedAt = this.parseNumber(map.get("updated_at"), createdAt);
    return {
      id: workflowId,
      doName: this.ctx.id.name ?? this.ctx.id.toString(),
      name: map.get("name") ?? undefined,
      type: map.get("type") ?? undefined,
      status: map.get("status") ?? DEFAULT_STATUS,
      createdAt,
      updatedAt
    };
  }

  private buildDetailFromMeta(map: Map<string, string>): WorkflowDetail {
    const summary = this.buildSummaryFromMeta(map);
    const document = this.parseJson<unknown>(map.get("current_document"));
    const code = map.get("current_code") ?? "";
    const lastRestoredVersionId = map.get("last_restored_version_id") ?? null;
    const versions = this.listVersionHeaders();
    return {
      workflowId: summary.id,
      name: summary.name,
      type: summary.type,
      status: summary.status,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      document,
      code,
      lastRestoredVersionId,
      versions
    };
  }

  async initialize(input: InitializeInput): Promise<WorkflowDetail> {
    this.ensureSchema();
    const map = this.getMetaMap();
    const now = Date.now();
    const workflowId = map.get("workflow_id") ?? input.workflowId;

    this.setMeta("workflow_id", workflowId);

    const type = input.type ?? map.get("type") ?? undefined;
    if (type) {
      this.setMeta("type", type);
    }

    const derivedName = input.name ?? deriveNameFromDocument(input.document);
    if (derivedName) {
      this.setMeta("name", derivedName);
    }

    const status = input.status ?? map.get("status") ?? DEFAULT_STATUS;
    this.setMeta("status", status);

    const createdAt = map.has("created_at") ? this.parseNumber(map.get("created_at"), now) : now;
    this.setMeta("created_at", createdAt.toString());
    this.setMeta("updated_at", now.toString());

    this.setMeta("current_document", JSON.stringify(input.document));
    this.setMeta("current_code", input.code);

    const detail = this.buildDetailFromMeta(this.getMetaMap());
    await upsertIndex(this.env, this.buildSummaryFromMeta(this.getMetaMap()));
    return detail;
  }

  async getDetail(): Promise<WorkflowDetail> {
    const detail = this.buildDetailFromMeta(this.getMetaMap());
    return detail;
  }

  async getSummary(): Promise<WorkflowSummary> {
    return this.buildSummaryFromMeta(this.getMetaMap());
  }

  async updateState(input: UpdateStateInput): Promise<WorkflowDetail> {
    const map = this.getMetaMap();
    const now = Date.now();

    this.setMeta("current_document", JSON.stringify(input.document));
    this.setMeta("current_code", input.code);

    if (input.type) {
      this.setMeta("type", input.type);
    }

    if (input.name) {
      this.setMeta("name", input.name);
    } else {
      const derivedName = deriveNameFromDocument(input.document);
      if (derivedName) {
        this.setMeta("name", derivedName);
      }
    }

    if (input.status) {
      this.setMeta("status", input.status);
    }

    this.setMeta("updated_at", now.toString());

    const detail = this.buildDetailFromMeta(this.getMetaMap());
    await upsertIndex(this.env, this.buildSummaryFromMeta(this.getMetaMap()));
    return detail;
  }

  async saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader> {
    const now = Date.now();
    const map = this.getMetaMap();
    const seqRow = this.sql.exec(`SELECT COALESCE(MAX(seq), 0) as seq FROM versions`).toArray()[0] as
      | { seq?: number | string | null }
      | undefined;
    const nextSeq = Number(seqRow?.seq ?? 0) + 1;

    const trimmed = input.name?.trim();
    const label = trimmed && trimmed.length > 0 ? trimmed : `Auto-save ${new Date(now).toLocaleString()}`;
    const isNamed = Boolean(trimmed && trimmed.length > 0);

    const record: WorkflowVersionRecord = {
      id: crypto.randomUUID(),
      seq: nextSeq,
      name: label,
      createdAt: now,
      document: JSON.stringify(input.document),
      code: input.code,
      isNamed
    };

    this.insertVersion(record);
    this.enforceVersionLimit(MAX_VERSION_HISTORY);

    this.setMeta("last_restored_version_id", record.id);
    this.setMeta("updated_at", now.toString());

    await upsertIndex(this.env, this.buildSummaryFromMeta(this.getMetaMap()));

    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      isNamed: record.isNamed
    };
  }

  async listVersionHeadersPublic(): Promise<WorkflowVersionHeader[]> {
    return this.listVersionHeaders();
  }

  async restoreVersion({ versionId }: RestoreVersionInput): Promise<WorkflowDetail> {
    const record = this.getVersionRecord(versionId);
    if (!record) {
      throw new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: JSON_CORS_HEADERS
      });
    }
    this.setMeta("current_document", record.document);
    this.setMeta("current_code", record.code);
    this.setMeta("last_restored_version_id", record.id);
    this.setMeta("updated_at", Date.now().toString());
    const detail = this.buildDetailFromMeta(this.getMetaMap());
    await upsertIndex(this.env, this.buildSummaryFromMeta(this.getMetaMap()));
    return detail;
  }

  async renameVersion({ versionId, name }: RenameVersionInput): Promise<WorkflowVersionHeader> {
    const record = this.getVersionRecord(versionId);
    if (!record) {
      throw new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: JSON_CORS_HEADERS
      });
    }
    const trimmed = name.trim();
    const label = trimmed.length > 0 ? trimmed : record.name;
    const isNamed = trimmed.length > 0;
    this.sql.exec(`UPDATE versions SET name = ?, is_named = ? WHERE id = ?`, label, isNamed ? 1 : 0, versionId);
    return {
      id: versionId,
      name: label,
      createdAt: record.createdAt,
      isNamed
    };
  }

  async deleteVersion({ versionId }: DeleteVersionInput): Promise<void> {
    const record = this.getVersionRecord(versionId);
    if (!record) {
      return;
    }
    this.sql.exec(`DELETE FROM versions WHERE id = ?`, versionId);
    const lastRestored = this.getMetaValue("last_restored_version_id");
    if (lastRestored === versionId) {
      this.deleteMeta("last_restored_version_id");
    }
  }

  async deleteWorkflow(): Promise<void> {
    const map = this.getMetaMap();
    const workflowId = map.get("workflow_id") ?? this.ctx.id.name ?? this.ctx.id.toString();
    await this.ctx.storage.deleteAll();
    this.schemaReady = false;
    await removeFromIndex(this.env, workflowId);
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/(^\/+|\/+?$)/g, "");
    const segments = pathname ? pathname.split("/") : [];

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (segments.length === 0) {
        if (request.method === "GET") {
          return jsonResponse({
            message: "Workflow Worker running",
            routes: [
              "GET /workflows",
              "POST /workflows",
              "GET /workflows/:id",
              "PATCH /workflows/:id",
              "DELETE /workflows/:id",
              "POST /workflows/:id/versions",
              "POST /workflows/:id/versions/:versionId/restore",
              "PATCH /workflows/:id/versions/:versionId",
              "DELETE /workflows/:id/versions/:versionId"
            ]
          });
        }
        return methodNotAllowed();
      }

      if (segments[0] !== "workflows") {
        return notFound();
      }

      if (segments.length === 1) {
        if (request.method === "GET") {
          await ensureIndexTable(env);
          const limit = Number(url.searchParams.get("limit") ?? "50");
          const offset = Number(url.searchParams.get("offset") ?? "0");
          const result = await env.WORKFLOW_INDEX.prepare(
            `SELECT id, name, type, status, created_at, updated_at
             FROM workflows_index
             ORDER BY updated_at DESC
             LIMIT ? OFFSET ?`
          )
            .bind(limit, offset)
            .all();
          return jsonResponse({ items: result.results ?? [] });
        }

        if (request.method === "POST") {
          const body = await readJson<{
            id?: string;
            type?: string;
            name?: string;
            status?: string;
            document: unknown;
            code: string;
          }>(request);

          if (body.document === undefined || typeof body.code !== "string") {
            return jsonResponse({ error: "`document` and `code` are required" }, { status: 400 });
          }

          const workflowId = (body.id ?? crypto.randomUUID()).trim();
          if (!workflowId) {
            return jsonResponse({ error: "Workflow id is required" }, { status: 400 });
          }

          const stub = env.WORKFLOW_RUNNER.get(env.WORKFLOW_RUNNER.idFromName(workflowId));
          const detail = await stub.initialize({
            workflowId,
            type: body.type,
            name: body.name,
            status: body.status,
            document: body.document,
            code: body.code
          });
          return jsonResponse(detail, { status: 201 });
        }

        return methodNotAllowed();
      }

      const workflowId = segments[1];
      const stub = env.WORKFLOW_RUNNER.get(env.WORKFLOW_RUNNER.idFromName(workflowId));

      if (segments.length === 2) {
        if (request.method === "GET") {
          try {
            const detail = await stub.getDetail();
            return jsonResponse(detail);
          } catch (error) {
            if (error instanceof Response) {
              return error;
            }
            return notFound("Workflow not initialized");
          }
        }

        if (request.method === "PATCH" || request.method === "PUT") {
          const body = await readJson<UpdateStateInput>(request);
          if (body.document === undefined || typeof body.code !== "string") {
            return jsonResponse({ error: "`document` and `code` are required" }, { status: 400 });
          }
          const detail = await stub.updateState(body);
          return jsonResponse(detail);
        }

        if (request.method === "DELETE") {
          await stub.deleteWorkflow();
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        return methodNotAllowed();
      }

      if (segments.length === 3 && segments[2] === "versions") {
        if (request.method === "GET") {
          const versions = await stub.listVersionHeadersPublic();
          return jsonResponse({ items: versions });
        }

        if (request.method === "POST") {
          const body = await readJson<SaveVersionInput>(request);
          if (body.document === undefined || typeof body.code !== "string") {
            return jsonResponse({ error: "`document` and `code` are required" }, { status: 400 });
          }
          const version = await stub.saveVersion(body);
          return jsonResponse(version, { status: 201 });
        }

        return methodNotAllowed();
      }

      if (segments.length >= 4 && segments[2] === "versions") {
        const versionId = segments[3];

        if (segments.length === 5 && segments[4] === "restore") {
          if (request.method !== "POST") {
            return methodNotAllowed();
          }
          const detail = await stub.restoreVersion({ versionId });
          return jsonResponse(detail);
        }

        if (request.method === "PATCH") {
          const body = await readJson<{ name: string }>(request);
          if (typeof body.name !== "string") {
            return jsonResponse({ error: "`name` is required" }, { status: 400 });
          }
          const version = await stub.renameVersion({ versionId, name: body.name });
          return jsonResponse(version);
        }

        if (request.method === "DELETE") {
          await stub.deleteVersion({ versionId });
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        return methodNotAllowed();
      }

      return notFound();
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Unhandled worker error", error);
      return jsonResponse({ error: "Internal Server Error" }, { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
