import type { Context } from 'hono';
import { ServiceError } from './auth';

export function handleToolError(c: Context, error: unknown, operation: string) {
  console.error(`${operation} error:`, error);

  if (error instanceof ServiceError) {
    return c.json({
      success: false,
      error: error.message,
      code: error.code
    }, error.status as any);
  }

  return c.json({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    code: 'INTERNAL_ERROR'
  }, 500);
}