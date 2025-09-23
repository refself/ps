import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { workflowsIndex } from '@/db/d1-schema';
import type { WorkflowSummary } from '@/schemas/workflow-schemas';

export class WorkflowIndexRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1Database: D1Database) {
    this.db = drizzle(d1Database);
  }

  async upsert(summary: WorkflowSummary): Promise<void> {

    await this.db.insert(workflowsIndex)
      .values({
        id: summary.id,
        doName: summary.doName,
        name: summary.name ?? null,
        type: summary.type ?? null,
        status: summary.status,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt
      })
      .onConflictDoUpdate({
        target: workflowsIndex.id,
        set: {
          name: summary.name ?? null,
          type: summary.type ?? null,
          status: summary.status,
          updatedAt: summary.updatedAt
        }
      });
  }

  async remove(workflowId: string): Promise<void> {
    await this.db.delete(workflowsIndex)
      .where(eq(workflowsIndex.id, workflowId));
  }

  async list({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<unknown[]> {
    const result = await this.db.select()
      .from(workflowsIndex)
      .orderBy(workflowsIndex.updatedAt)
      .limit(limit)
      .offset(offset);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    }));
  }
}
