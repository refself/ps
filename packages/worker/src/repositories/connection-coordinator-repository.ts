import { drizzle } from 'drizzle-orm/durable-sqlite';
import { and, desc, eq } from 'drizzle-orm';
import { pendingToolRequests } from '@/db/connection-coordinator-schema';

export type ToolRequestStatus = 'pending' | 'success' | 'error';

export interface ToolRequestRecord {
  requestId: string;
  workflowId: string;
  tool: string;
  params: string;
  status: ToolRequestStatus;
  responseData?: string | null;
  error?: string | null;
  createdAt: number;
  resolvedAt?: number | null;
}

interface ListOptions {
  workflowId?: string;
  status?: ToolRequestStatus;
  limit?: number;
}

interface CreateRequestInput {
  requestId: string;
  workflowId: string;
  tool: string;
  params: string;
  createdAt: number;
}

interface ResolveSuccessInput {
  requestId: string;
  responseData?: string | null;
  resolvedAt: number;
}

interface ResolveErrorInput {
  requestId: string;
  error?: string | null;
  resolvedAt: number;
}

export class ConnectionCoordinatorRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(storage: DurableObjectStorage) {
    this.db = drizzle(storage);
  }

  getDb() {
    return this.db;
  }

  createRequest(record: CreateRequestInput): void {
    this.db.insert(pendingToolRequests)
      .values({
        requestId: record.requestId,
        workflowId: record.workflowId,
        tool: record.tool,
        params: record.params,
        status: 'pending',
        responseData: null,
        error: null,
        createdAt: record.createdAt,
        resolvedAt: null,
      })
      .onConflictDoUpdate({
        target: pendingToolRequests.requestId,
        set: {
          workflowId: record.workflowId,
          tool: record.tool,
          params: record.params,
          status: 'pending',
          responseData: null,
          error: null,
          createdAt: record.createdAt,
          resolvedAt: null,
        },
      })
      .run();
  }

  markSuccess(input: ResolveSuccessInput): void {
    this.db.update(pendingToolRequests)
      .set({
        status: 'success',
        responseData: input.responseData ?? null,
        error: null,
        resolvedAt: input.resolvedAt,
      })
      .where(eq(pendingToolRequests.requestId, input.requestId))
      .run();
  }

  markError(input: ResolveErrorInput): void {
    this.db.update(pendingToolRequests)
      .set({
        status: 'error',
        responseData: null,
        error: input.error ?? null,
        resolvedAt: input.resolvedAt,
      })
      .where(eq(pendingToolRequests.requestId, input.requestId))
      .run();
  }

  getRequest(requestId: string): ToolRequestRecord | null {
    const row = this.db.select()
      .from(pendingToolRequests)
      .where(eq(pendingToolRequests.requestId, requestId))
      .get();

    return row ? this.mapRow(row) : null;
  }

  listRequests(options: ListOptions = {}): ToolRequestRecord[] {
    const whereClauses = [];
    if (options.workflowId) {
      whereClauses.push(eq(pendingToolRequests.workflowId, options.workflowId));
    }
    if (options.status) {
      whereClauses.push(eq(pendingToolRequests.status, options.status));
    }

    const query = this.db.select()
      .from(pendingToolRequests)
      .orderBy(desc(pendingToolRequests.createdAt));

    if (whereClauses.length === 1) {
      query.where(whereClauses[0]);
    } else if (whereClauses.length > 1) {
      query.where(and(...whereClauses));
    }

    if (options.limit && options.limit > 0) {
      query.limit(options.limit);
    }

    const rows = query.all();
    return rows.map(row => this.mapRow(row));
  }

  listPendingRequests(): ToolRequestRecord[] {
    return this.listRequests({ status: 'pending' });
  }

  private mapRow(row: typeof pendingToolRequests.$inferSelect): ToolRequestRecord {
    return {
      requestId: String(row.requestId),
      workflowId: String(row.workflowId),
      tool: String(row.tool),
      params: String(row.params),
      status: row.status as ToolRequestStatus,
      responseData: row.responseData === null || row.responseData === undefined ? null : String(row.responseData),
      error: row.error === null || row.error === undefined ? null : String(row.error),
      createdAt: Number(row.createdAt),
      resolvedAt: row.resolvedAt === null || row.resolvedAt === undefined ? null : Number(row.resolvedAt),
    };
  }
}
