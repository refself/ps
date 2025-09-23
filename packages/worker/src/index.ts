import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { workflows } from './routes/workflows';
import { WorkflowDurableObject } from './durable-objects/workflow-durable-object';

const app = new Hono<{ Bindings: Env }>();

// Global CORS middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: "Workflow Worker running",
    routes: [
      "GET /workflows",
      "POST /workflows",
      "GET /workflows/:id",
      "PATCH /workflows/:id",
      "DELETE /workflows/:id",
      "POST /workflows/:id/versions",
      "POST /workflows/:id/versions/:versionId/restore",
      "PATCH /workflows/:id/versions/:versionId",
      "DELETE /workflows/:id/versions/:versionId"
    ]
  });
});

// Mount workflow routes
app.route('/workflows', workflows);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled worker error', err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Export the Hono app as the default handler
export default app;

// Export the DurableObject
export { WorkflowDurableObject };