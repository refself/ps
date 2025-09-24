import { existsSync } from "node:fs";
import { Readable } from "node:stream";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { EmptyResultSchema } from "@modelcontextprotocol/sdk/types.js";
const DEFAULT_COMMAND = process.env.REFLOW_MCP_COMMAND ??
    "/Users/usf/Desktop/reflow-operator-mcp/reflow-mcp-server/.build/debug/reflow-mcp-server";
const DEFAULT_ENV = {
    AI_API_TOKEN: process.env.REFLOW_AI_API_TOKEN ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MjMzNjEyZC1jYzdhLTQ1N2EtYWRmOC1iMGY1Y2QwZWFhYTYiLCJpYXQiOjE3NTY5ODg5OTF9.ceiGJ1awdt_v7HdJ_Pqn6VAGFA6ymqC2LIzZvmkme1I",
    AI_BASE_URL: process.env.REFLOW_AI_BASE_URL ?? "https://ai-service-staging.reflow.ai/v1"
};
const EXECUTION_TIMEOUT_MS = 60_000;
const assertServerBinary = (command) => {
    if (!existsSync(command)) {
        throw new Error(`Reflow MCP server not found at "${command}". Set REFLOW_MCP_COMMAND environment variable to the executable path.`);
    }
};
const buildExecutionEnv = () => {
    const env = { ...DEFAULT_ENV };
    Object.entries(process.env).forEach(([key, value]) => {
        if (typeof value === "string") {
            env[key] = value;
        }
    });
    return env;
};
const normalizeOutput = (result) => {
    if (!result || typeof result !== "object") {
        return { output: null, raw: result };
    }
    const maybeContent = result.content;
    if (Array.isArray(maybeContent)) {
        const collected = maybeContent
            .map((item) => {
            if (item && typeof item === "object" && item.type === "text") {
                return String(item.text ?? "");
            }
            if (item && typeof item === "object" && item.type === "resource_link") {
                const name = item.name ?? "resource";
                const uri = item.uri ?? "";
                return `resource: ${String(name)} -> ${String(uri)}`;
            }
            return null;
        })
            .filter((value) => Boolean(value));
        if (collected.length > 0) {
            return { output: collected.join("\n"), raw: result };
        }
    }
    if (result.output) {
        return {
            output: String(result.output ?? ""),
            raw: result
        };
    }
    if (result.structuredContent) {
        return {
            output: JSON.stringify(result.structuredContent, null, 2),
            raw: result
        };
    }
    return { output: JSON.stringify(result, null, 2), raw: result };
};
export const runReflowScript = async (script) => {
    const startedAt = Date.now();
    assertServerBinary(DEFAULT_COMMAND);
    const logs = [];
    const transport = new StdioClientTransport({
        command: DEFAULT_COMMAND,
        env: buildExecutionEnv(),
        stderr: "pipe"
    });
    const stderrStream = transport.stderr;
    if (stderrStream instanceof Readable) {
        stderrStream.setEncoding("utf8");
        stderrStream.on("data", (chunk) => {
            const text = typeof chunk === "string" ? chunk : chunk.toString();
            text.split(/\r?\n/).forEach((rawLine) => {
                const trimmed = rawLine.trim();
                if (trimmed.length > 0) {
                    logs.push(trimmed);
                }
            });
        });
    }
    transport.onerror = (error) => {
        logs.push(`transport error: ${error instanceof Error ? error.message : String(error)}`);
    };
    const client = new Client({
        name: "workflow-builder",
        version: "0.0.0"
    });
    const closeSafely = async () => {
        try {
            await client.close();
        }
        catch (closeError) {
            logs.push(`close failed: ${closeError instanceof Error ? closeError.message : String(closeError)}`);
        }
    };
    const abortController = new AbortController();
    const overallTimeout = setTimeout(() => {
        abortController.abort();
    }, EXECUTION_TIMEOUT_MS);
    try {
        await client.connect(transport, {
            signal: abortController.signal,
            timeout: EXECUTION_TIMEOUT_MS
        });
        const callResult = await client.callTool({
            name: "execute_script",
            arguments: {
                script
            }
        }, undefined, {
            signal: abortController.signal,
            timeout: EXECUTION_TIMEOUT_MS
        });
        try {
            await client.request({ method: "shutdown" }, EmptyResultSchema, {
                timeout: 5_000
            });
        }
        catch (error) {
            logs.push(`shutdown request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        await closeSafely();
        const { output } = normalizeOutput(callResult);
        return {
            ok: !callResult.isError,
            output,
            raw: callResult,
            logs,
            error: callResult.isError ? output ?? "Tool reported an error" : undefined,
            durationMs: Date.now() - startedAt
        };
    }
    catch (error) {
        await closeSafely();
        const message = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            error: message,
            logs,
            durationMs: Date.now() - startedAt
        };
    }
    finally {
        clearTimeout(overallTimeout);
    }
};
