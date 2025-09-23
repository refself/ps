import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/durable-object',
  schema: './src/repositories/durable-object-schema.ts',
  dialect: 'sqlite',
  driver: 'durable-sqlite',
});