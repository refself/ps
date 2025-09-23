import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { routeAgentRequest } from 'agents';
import { workflows } from '@/routes/workflows';
import { WorkflowAgent } from '@/agents/workflow-agent';
import { ConnectionCoordinator } from '@/agents/connection-coordinator';
import { jwtAuth } from '@/middleware/auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

app.use('*', jwtAuth);

app.all('/agents/*', async (c) => {
  const response = await routeAgentRequest(c.req.raw, c.env);
  return response || c.json({ error: 'Agent not found' }, 404);
});

app.route('/workflows', workflows);

app.onError((err, c) => {
  console.error('Unhandled worker error', err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export { WorkflowAgent, ConnectionCoordinator };
