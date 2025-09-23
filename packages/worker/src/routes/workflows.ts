import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WorkflowIndexRepository } from '../repositories/workflow-index';
import { CORS_HEADERS } from '../constants';
import type {
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput
} from '../types/workflow';
import type { WorkflowDurableObjectStub } from '../types/durable-object';

const workflows = new Hono<{ Bindings: Env }>();

// Helper function to get typed workflow stub
function getWorkflowStub(env: Env, workflowId: string): WorkflowDurableObjectStub {
  return env.WORKFLOW_RUNNER.get(env.WORKFLOW_RUNNER.idFromName(workflowId)) as WorkflowDurableObjectStub;
}

// CORS middleware
workflows.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

// List workflows
workflows.get('/', async (c) => {
  const limit = Number(c.req.query('limit') ?? '50');
  const offset = Number(c.req.query('offset') ?? '0');

  const indexRepo = new WorkflowIndexRepository(c.env.WORKFLOW_INDEX);
  const items = await indexRepo.list({ limit, offset });

  return c.json({ items });
});

// Create workflow
workflows.post('/', async (c) => {
  const body = await c.req.json() as {
    id?: string;
    type?: string;
    name?: string;
    status?: string;
    document: unknown;
    code: string;
  };

  if (body.document === undefined || typeof body.code !== "string") {
    return c.json({ error: "`document` and `code` are required" }, 400);
  }

  const workflowId = (body.id ?? crypto.randomUUID()).trim();
  if (!workflowId) {
    return c.json({ error: "Workflow id is required" }, 400);
  }

  const stub = getWorkflowStub(c.env, workflowId);
  const detail = await stub.initialize({
    workflowId,
    type: body.type,
    name: body.name,
    status: body.status,
    document: body.document,
    code: body.code
  });

  return c.json(detail, 201);
});

// Get workflow detail
workflows.get('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const stub = getWorkflowStub(c.env, workflowId);

  try {
    const detail = await stub.getDetail();
    return c.json(detail);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return c.json({ error: "Workflow not initialized" }, 404);
  }
});

// Update workflow
workflows.patch('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const body = await c.req.json() as UpdateStateInput;

  if (body.document === undefined || typeof body.code !== "string") {
    return c.json({ error: "`document` and `code` are required" }, 400);
  }

  const stub = getWorkflowStub(c.env, workflowId);
  const detail = await stub.updateState(body);

  return c.json(detail);
});

workflows.put('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const body = await c.req.json() as UpdateStateInput;

  if (body.document === undefined || typeof body.code !== "string") {
    return c.json({ error: "`document` and `code` are required" }, 400);
  }

  const stub = getWorkflowStub(c.env, workflowId);
  const detail = await stub.updateState(body);

  return c.json(detail);
});

// Delete workflow
workflows.delete('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const stub = getWorkflowStub(c.env, workflowId);

  await stub.deleteWorkflow();
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

// List versions
workflows.get('/:id/versions', async (c) => {
  const workflowId = c.req.param('id');
  const stub = getWorkflowStub(c.env, workflowId);

  const versions = await stub.listVersionHeadersPublic();
  return c.json({ items: versions });
});

// Save version
workflows.post('/:id/versions', async (c) => {
  const workflowId = c.req.param('id');
  const body = await c.req.json() as SaveVersionInput;

  if (body.document === undefined || typeof body.code !== "string") {
    return c.json({ error: "`document` and `code` are required" }, 400);
  }

  const stub = getWorkflowStub(c.env, workflowId);
  const version = await stub.saveVersion(body);

  return c.json(version, 201);
});

// Restore version
workflows.post('/:id/versions/:versionId/restore', async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');

  const stub = getWorkflowStub(c.env, workflowId);
  const detail = await stub.restoreVersion({ versionId });

  return c.json(detail);
});

// Rename version
workflows.patch('/:id/versions/:versionId', async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');
  const body = await c.req.json() as { name: string };

  if (typeof body.name !== "string") {
    return c.json({ error: "`name` is required" }, 400);
  }

  const stub = getWorkflowStub(c.env, workflowId);
  const version = await stub.renameVersion({ versionId, name: body.name });

  return c.json(version);
});

// Delete version
workflows.delete('/:id/versions/:versionId', async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');

  const stub = getWorkflowStub(c.env, workflowId);
  await stub.deleteVersion({ versionId });

  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

export { workflows };