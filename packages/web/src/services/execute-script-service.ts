export type ExecuteScriptResponse = {
  ok: boolean;
  output?: string | null;
  raw?: unknown;
  logs?: string[];
  error?: string;
  durationMs?: number;
};

export const executeWorkflowScript = async (code: string): Promise<ExecuteScriptResponse> => {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Workflow code is required."
    };
  }

  const response = await fetch("/api/execute-script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code: trimmed })
  });

  let payload: ExecuteScriptResponse;
  try {
    payload = (await response.json()) as ExecuteScriptResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse execute script response."
    };
  }

  if (!response.ok || !payload.ok) {
    return {
      ...payload,
      ok: false
    };
  }

  return payload;
};
