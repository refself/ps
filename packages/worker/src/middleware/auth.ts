import { createMiddleware } from 'hono/factory';
import { extractUserIdFromRequest, ServiceError } from '@/utils/auth';

type AuthVariables = {
  userId: string;
};

export const jwtAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  try {
    // const jwtSecret = await c.env.JWT_SECRET.get();

    // const userId = await extractUserIdFromRequest(c.req.raw, jwtSecret);
    const userId = "aceca593-9511-4621-a567-449207737244"
    c.set('userId', userId);

    await next();
  } catch (error) {
    console.error('JWT authentication failed:', error);

    if (error instanceof ServiceError) {
      return c.json({ error: error.message }, error.status as any);
    }

    return c.json({ error: 'Authentication failed' }, 401);
  }
});
