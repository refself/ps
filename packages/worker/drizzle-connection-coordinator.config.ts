import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/connection-coordinator',
  schema: './src/db/connection-coordinator-schema.ts',
  dialect: 'sqlite',
  driver: 'durable-sqlite',
});
