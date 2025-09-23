import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const workflowsIndex = sqliteTable('workflows_index', {
  id: text('id').primaryKey(),
  doName: text('do_name').notNull(),
  name: text('name'),
  type: text('type'),
  status: text('status'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
