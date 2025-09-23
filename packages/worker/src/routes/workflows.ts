import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WorkflowIndexRepository } from '@/repositories/workflow-index';
import { CORS_HEADERS } from '@/constants';
import {
  InitializeInputSchema,
  UpdateStateInputSchema,
  SaveVersionInputSchema,
  RenameVersionInputSchema,
  WorkflowListQuerySchema,
} from '@/schemas/workflow-schemas';
import {
  ExecuteScriptSchema,
  StartRecordingSchema,
  StopRecordingSchema,
  GetRecordingSchema,
} from '@/schemas/osclient-tools';
import { getAgentByName } from 'agents';
import { handleToolError } from '@/utils/error-handling';

const workflows = new Hono<{
  Bindings: Env;
  Variables: {
    userId: string;
  };
}>();

async function getWorkflowAgent(env: Env, workflowId: string): Promise<any> {
  return getAgentByName(env.WORKFLOW_RUNNER, workflowId) as Promise<any>;
}

// List workflows
workflows.get('/', zValidator('query', WorkflowListQuerySchema), async (c) => {
  const { limit, offset } = c.req.valid('query');

  const indexRepo = new WorkflowIndexRepository(c.env.WORKFLOW_INDEX);
  const items = await indexRepo.list({ limit, offset });

  return c.json({ items });
});

// Create workflow
workflows.post('/', zValidator('json', InitializeInputSchema.omit({ workflowId: true }).extend({
  id: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json');

  const workflowId = (body.id ?? crypto.randomUUID()).trim();
  if (!workflowId) {
    return c.json({ error: "Workflow id is required" }, 400);
  }

  const agent = await getWorkflowAgent(c.env, workflowId);
  const detail = agent.initialize({
      workflowId,
      type: body.type,
      name: body.name,
      status: body.status,
      document: body.document,
      code: body.code
  });

  return c.json(detail, 201);
});

workflows.get('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const agent = await getWorkflowAgent(c.env, workflowId);

  try {
    const detail = agent.getDetail();
    return c.json(detail);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return c.json({ error: "Workflow not initialized" }, 404);
  }
});

// Update workflow
workflows.patch('/:id', zValidator('json', UpdateStateInputSchema), async (c) => {
  const workflowId = c.req.param('id');
  const body = c.req.valid('json');

  const agent = await getWorkflowAgent(c.env, workflowId);
  const detail = agent.updateState(body);

  return c.json(detail);
});

workflows.put('/:id', zValidator('json', UpdateStateInputSchema), async (c) => {
  const workflowId = c.req.param('id');
  const body = c.req.valid('json');

  const agent = await getWorkflowAgent(c.env, workflowId);
  const detail = agent.updateState(body);

  return c.json(detail);
});

// Delete workflow
workflows.delete('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const agent = await getWorkflowAgent(c.env, workflowId);

  await agent.deleteWorkflow();
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

// List versions
workflows.get('/:id/versions', async (c) => {
  const workflowId = c.req.param('id');
  const agent = await getWorkflowAgent(c.env, workflowId);

  const versions = await agent.listVersionHeaders();
  return c.json({ items: versions });
});

// Save version
workflows.post('/:id/versions', zValidator('json', SaveVersionInputSchema), async (c) => {
  const workflowId = c.req.param('id');
  const body = c.req.valid('json');

  const agent = await getWorkflowAgent(c.env, workflowId);
  const version = await agent.saveVersion(body);

  return c.json(version, 201);
});

// Restore version
workflows.post('/:id/versions/:versionId/restore', async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');

  const agent = await getWorkflowAgent(c.env, workflowId);
  const detail = agent.restoreVersion({ versionId });

  return c.json(detail);
});

// Rename version
workflows.patch('/:id/versions/:versionId', zValidator('json', RenameVersionInputSchema.omit({ versionId: true })), async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');
  const body = c.req.valid('json');

  const agent = await getWorkflowAgent(c.env, workflowId);
  const version = await agent.renameVersion({ versionId, name: body.name });

  return c.json(version);
});

// Delete version
workflows.delete('/:id/versions/:versionId', async (c) => {
  const workflowId = c.req.param('id');
  const versionId = c.req.param('versionId');

  const agent = await getWorkflowAgent(c.env, workflowId);
  await agent.deleteVersion({ versionId });

  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

// OS Client tool execution routes (authenticated)
workflows.post('/:id/tools/execute-script', zValidator('json', ExecuteScriptSchema), async (c) => {
  const workflowId = c.req.param('id');
  const params = c.req.valid('json');
  const userId = c.get('userId'); // From JWT middleware

  try {
    const agent = await getWorkflowAgent(c.env, workflowId);
    const result = await (agent as any).executeScript(userId, params);
    return c.json({ success: true, data: result });
  } catch (error) {
    return handleToolError(c, error, 'Script execution');
  }
});

workflows.post('/:id/tools/start-recording', zValidator('json', StartRecordingSchema), async (c) => {
  const workflowId = c.req.param('id');
  const params = c.req.valid('json');
  const userId = c.get('userId'); // From JWT middleware

  try {
    const agent = await getWorkflowAgent(c.env, workflowId);
    const result = await agent.startRecording(userId, params);
    return c.json({ success: true, data: result });
  } catch (error) {
    return handleToolError(c, error, 'Start recording');
  }
});

workflows.post('/:id/tools/stop-recording', zValidator('json', StopRecordingSchema), async (c) => {
  const workflowId = c.req.param('id');
  const params = c.req.valid('json');
  const userId = c.get('userId'); // From JWT middleware

  try {
    const agent = await getWorkflowAgent(c.env, workflowId);
    const result = await agent.stopRecording(userId, params);
    return c.json({ success: true, data: result });
  } catch (error) {
    return handleToolError(c, error, 'Stop recording');
  }
});

workflows.get('/:id/tools/recording/:recordingId', async (c) => {
  const workflowId = c.req.param('id');
  const recordingId = c.req.param('recordingId');
  const userId = c.get('userId'); // From JWT middleware

  try {
    const agent = await getWorkflowAgent(c.env, workflowId);
    const result = await agent.getRecording(userId, { recordingId });
    return c.json({ success: true, data: result });
  } catch (error) {
    return handleToolError(c, error, 'Get recording');
  }
});

export { workflows };
