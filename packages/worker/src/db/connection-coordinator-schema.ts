import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const pendingToolRequests = sqliteTable('pending_tool_requests', {
  requestId: text('request_id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  tool: text('tool').notNull(),
  params: text('params').notNull(),
  status: text('status').notNull(),
  responseData: text('response_data'),
  error: text('error'),
  createdAt: integer('created_at').notNull(),
  resolvedAt: integer('resolved_at'),
});
