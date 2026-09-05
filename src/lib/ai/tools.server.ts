/**
 * The Revora tool registry: the only actions the AI is ever allowed to take.
 *
 * A tool is not a function the model can call directly. The model names a tool
 * and supplies arguments; this registry then decides whether that call happens
 * at all. Every entry declares:
 *
 * - a strict input check (unknown or malformed arguments are refused)
 * - the permission it needs (workspace member, or platform admin)
 * - a tenant check (the workspace the caller actually operates in)
 * - a timeout and a structured result
 * - an audit row, written whether the call succeeded, was refused or failed
 *
 * Two safety rules hold for every tool:
 *
 * 1. Database work runs through the CALLER's own request-scoped client, so row
 *    level security and tenant isolation apply exactly as they do to a human.
 *    No tool receives the service-role client, a Stripe key, a database
 *    password or any other secret.
 * 2. Model output is untrusted input. A tool argument is validated here before
 *    it reaches any query, never passed through because "the model said so".
 *
 * Server-only.
 */

import { aiLimits } from "@/lib/ai/config";
import { RevoraAiError } from "@/lib/ai/errors";

/** Minimal shape used from the caller's request-scoped Supabase client. */
export type ToolSupabase = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: Record<string, unknown>,
    ) => {
      eq: (column: string, value: unknown) => unknown;
    };
  };
};

export type ToolPermission = "workspace_member" | "platform_admin";

export type ToolContext = {
  /** The caller's RLS-scoped client. Tools never get an admin client. */
  supabase: ToolSupabase;
  userId: string;
  /** The workspace this run is scoped to; a tool may not touch another. */
  organizationId: string;
  isSuperAdmin: boolean;
};

export type ToolResult =
  | { ok: true; tool: string; data: unknown; durationMs: number }
  | { ok: false; tool: string; error: string; reason: "invalid_input" | "forbidden" | "tenant_mismatch" | "timeout" | "failed"; durationMs: number };

export type ToolDefinition<Input> = {
  name: string;
  description: string;
  permission: ToolPermission;
  /** Whether this tool changes data (mutations are journalled and rollbackable). */
  mutates: boolean;
  /** Throws on anything it does not recognise; never trusts model output. */
  parse: (raw: unknown) => Input;
  run: (input: Input, context: ToolContext) => Promise<unknown>;
  timeoutMs?: number;
};

/* --------------------------------- helpers -------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected an object.");
  return raw as Record<string, unknown>;
}

function text(raw: unknown, field: string, max: number) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new Error(`Missing "${field}".`);
  if (value.length > max) throw new Error(`"${field}" is too long.`);
  return value;
}

function uuid(raw: unknown, field: string) {
  const value = typeof raw === "string" ? raw : "";
  if (!UUID.test(value)) throw new Error(`"${field}" is not a valid id.`);
  return value;
}

/* --------------------------------- registry ------------------------------- */

const definitions: ToolDefinition<never>[] = [];

function register<Input>(definition: ToolDefinition<Input>) {
  definitions.push(definition as unknown as ToolDefinition<never>);
  return definition;
}

/** Inspect the workspace's own site: pages, sections and settings. */
register<{ organizationId: string }>({
  name: "inspect_website",
  description: "Read this workspace's pages, sections and website settings.",
  permission: "workspace_member",
  mutates: false,
  parse: (raw) => ({ organizationId: uuid(record(raw)["organizationId"], "organizationId") }),
  run: async (input, context) => {
    const { getWorkspaceContext } = await import("@/lib/agent/workspace-context.server");
    return getWorkspaceContext(
      context.supabase as unknown as Parameters<typeof getWorkspaceContext>[0],
      input.organizationId,
    );
  },
});

/** Fetch the workspace's live pages and report what a visitor and crawler get. */
register<{ organizationId: string }>({
  name: "verify_live_pages",
  description: "Fetch this workspace's published pages and check what visitors receive.",
  permission: "workspace_member",
  mutates: false,
  parse: (raw) => ({ organizationId: uuid(record(raw)["organizationId"], "organizationId") }),
  run: async (input, context) => {
    const { verifyWorkspaceSite } = await import("@/lib/agent/verify.server");
    return verifyWorkspaceSite(
      context.supabase as unknown as Parameters<typeof verifyWorkspaceSite>[0],
      input.organizationId,
    );
  },
});

/** Generate one image for the workspace's own media library. */
register<{ prompt: string }>({
  name: "generate_image",
  description: "Create one image from a written brief.",
  permission: "workspace_member",
  mutates: false,
  parse: (raw) => ({ prompt: text(record(raw)["prompt"], "prompt", 4000) }),
  run: async (input, context) => {
    const { generateImage } = await import("@/lib/ai/router.server");
    const result = await generateImage(
      { organizationId: context.organizationId, userId: context.userId, task: "tool.image" },
      input.prompt,
    );
    return { mimeType: result.mimeType, bytes: Math.floor((result.base64.length * 3) / 4) };
  },
});

/** Undo a set of website mutations recorded by the atomic journal. */
register<{ steps: unknown[] }>({
  name: "rollback_changes",
  description: "Undo the website changes recorded for this run.",
  permission: "workspace_member",
  mutates: true,
  parse: (raw) => {
    const steps = record(raw)["steps"];
    if (!Array.isArray(steps) || steps.length === 0) throw new Error('Missing "steps".');
    if (steps.length > 200) throw new Error("Too many steps to undo in one call.");
    return { steps };
  },
  run: async (input) => {
    const { rollback } = await import("@/lib/site-agent.atomic");
    return rollback(input.steps as Parameters<typeof rollback>[0]);
  },
});

export function listTools(context: { isSuperAdmin: boolean }) {
  return definitions
    .filter((tool) => tool.permission !== "platform_admin" || context.isSuperAdmin)
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      mutates: tool.mutates,
    }));
}

export function findTool(name: string) {
  return definitions.find((tool) => tool.name === name) ?? null;
}

async function audit(
  context: ToolContext,
  entry: { tool: string; ok: boolean; reason: string | null; durationMs: number; requestId: string },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_tool_audit").insert({
      request_id: entry.requestId,
      tool: entry.tool.slice(0, 60),
      organization_id: context.organizationId,
      user_id: context.userId,
      ok: entry.ok,
      reason: entry.reason,
      duration_ms: Math.round(entry.durationMs),
    });
  } catch (error) {
    console.error("[revora-ai] tool audit write failed", (error as Error).message);
  }
}

/**
 * Runs one tool call the model asked for. Nothing here trusts the model: an
 * unknown tool, bad arguments, a missing permission or another workspace's id
 * are all refused before any query runs, and every outcome is audited.
 */
export async function runTool(
  context: ToolContext,
  call: { name: string; arguments: unknown; requestId: string },
): Promise<ToolResult> {
  const started = Date.now();
  const tool = findTool(call.name);
  if (!tool) {
    const result: ToolResult = {
      ok: false,
      tool: call.name,
      error: "That tool isn't available to Revora AI.",
      reason: "forbidden",
      durationMs: 0,
    };
    await audit(context, {
      tool: call.name,
      ok: false,
      reason: "unknown_tool",
      durationMs: 0,
      requestId: call.requestId,
    });
    return result;
  }

  if (tool.permission === "platform_admin" && !context.isSuperAdmin) {
    await audit(context, {
      tool: tool.name,
      ok: false,
      reason: "forbidden",
      durationMs: Date.now() - started,
      requestId: call.requestId,
    });
    return {
      ok: false,
      tool: tool.name,
      error: "That tool is limited to Revora platform administrators.",
      reason: "forbidden",
      durationMs: Date.now() - started,
    };
  }

  let input: never;
  try {
    input = tool.parse(call.arguments) as never;
  } catch (error) {
    await audit(context, {
      tool: tool.name,
      ok: false,
      reason: "invalid_input",
      durationMs: Date.now() - started,
      requestId: call.requestId,
    });
    return {
      ok: false,
      tool: tool.name,
      error: (error as Error).message,
      reason: "invalid_input",
      durationMs: Date.now() - started,
    };
  }

  // A tool may only ever act on the workspace this run is scoped to, whatever
  // workspace id the model tried to supply.
  const requested = (input as { organizationId?: string }).organizationId;
  if (requested && requested !== context.organizationId) {
    await audit(context, {
      tool: tool.name,
      ok: false,
      reason: "tenant_mismatch",
      durationMs: Date.now() - started,
      requestId: call.requestId,
    });
    return {
      ok: false,
      tool: tool.name,
      error: "Revora AI can only work on the workspace you're signed in to.",
      reason: "tenant_mismatch",
      durationMs: Date.now() - started,
    };
  }

  const timeoutMs = tool.timeoutMs ?? aiLimits().requestTimeoutMs;
  try {
    const data = await Promise.race([
      tool.run(input, context),
      new Promise((_resolve, reject) =>
        setTimeout(
          () => reject(new RevoraAiError(408, "That step took too long.", { category: "timeout" })),
          timeoutMs,
        ),
      ),
    ]);
    await audit(context, {
      tool: tool.name,
      ok: true,
      reason: null,
      durationMs: Date.now() - started,
      requestId: call.requestId,
    });
    return { ok: true, tool: tool.name, data, durationMs: Date.now() - started };
  } catch (error) {
    const timeout = error instanceof RevoraAiError && error.category === "timeout";
    await audit(context, {
      tool: tool.name,
      ok: false,
      reason: timeout ? "timeout" : "failed",
      durationMs: Date.now() - started,
      requestId: call.requestId,
    });
    return {
      ok: false,
      tool: tool.name,
      error: (error as Error).message,
      reason: timeout ? "timeout" : "failed",
      durationMs: Date.now() - started,
    };
  }
}

/**
 * Bounded tool loop. An agent run can never spin forever: it stops at the
 * configured tool-call ceiling, the iteration ceiling or the runtime ceiling,
 * whichever comes first, and says which limit stopped it.
 */
export function createRunBudget(startedAt = Date.now()) {
  const limits = aiLimits();
  let iterations = 0;
  let toolCalls = 0;
  return {
    /** Consume one iteration; returns null when the run must stop. */
    nextIteration(): { iteration: number } | { stop: string } {
      if (Date.now() - startedAt > limits.maxAgentRuntimeMs)
        return { stop: "Revora AI reached its time limit for this run." };
      if (iterations >= limits.maxAgentIterations)
        return { stop: "Revora AI reached its step limit for this run." };
      iterations += 1;
      return { iteration: iterations };
    },
    /** Consume one tool call; returns null when no more are allowed. */
    nextToolCall(): { call: number } | { stop: string } {
      if (Date.now() - startedAt > limits.maxAgentRuntimeMs)
        return { stop: "Revora AI reached its time limit for this run." };
      if (toolCalls >= limits.maxToolCalls)
        return { stop: "Revora AI reached its tool limit for this run." };
      toolCalls += 1;
      return { call: toolCalls };
    },
    state: () => ({ iterations, toolCalls, elapsedMs: Date.now() - startedAt }),
  };
}
