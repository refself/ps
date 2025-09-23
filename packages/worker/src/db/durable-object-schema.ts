import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const workflowMeta = sqliteTable('workflow_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(),
  seq: integer('seq').notNull(),
  name: text('name'),
  createdAt: integer('created_at').notNull(),
  document: text('document').notNull(),
  code: text('code').notNull(),
  isNamed: integer('is_named').notNull(),
}, (table) => [
  index('versions_seq_idx').on(table.seq)
]);

export const recordings = sqliteTable('recordings', {
  recordingId: text('recording_id').primaryKey(),
  status: text('status').notNull(),
  data: text('data'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  stoppedAt: integer('stopped_at'),
  lastError: text('last_error'),
});
