/**
 * Atomic state journal for the Site Agent.
 *
 * PURPOSE
 * -------
 * Every customer edit must be reversible.
 *
 * This journal captures the exact database state BEFORE an agent action,
 * allowing the caller to roll back previously completed actions if a later
 * action fails.
 *
 * IMPORTANT
 * ---------
 * PostgREST/Supabase calls are not automatically one transaction across
 * multiple requests. This module therefore provides application-level
 * atomicity:
 *
 *   capture → write → verify → rollback on failure
 *
 * The journal is intentionally tenant-aware. Every operation that can affect
 * customer website data is scoped by organization_id.
 */

import type { AgentAction } from "@/lib/site-agent";

type Row = Record<string, unknown>;

type QueryResult = {
  data: unknown;
  error: unknown;
};

type Chain = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => Chain;
  in: (column: string, values: unknown[]) => Chain;
  gte: (column: string, value: unknown) => Chain;
  select: (columns?: string) => Chain;
  maybeSingle: () => PromiseLike<QueryResult>;
};

export type JournalClient = {
  from: (table: string) => {
    select: (columns: string) => Chain;
    insert: (values: Row) => Chain;
    update: (values: Row) => Chain;
    delete: () => Chain;
  };
};

/**
 * A single operation that can restore state.
 */
export type UndoStep = {
  label: string;
  run: () => Promise<void>;
};

/**
 * Database fields that should never be manually restored.
 *
 * IDs and ownership fields must remain immutable.
 * Timestamp fields are also excluded because Supabase/database triggers
 * should control them.
 */
const IMMUTABLE = new Set([
  "id",
  "organization_id",
  "created_at",
  "updated_at",
]);

function restorable(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !IMMUTABLE.has(key)),
  );
}

type Target =
  | {
      kind: "update";
      table: string;
      id: string;
    }
  | {
      kind: "updateMany";
      table: string;
      ids: string[];
    }
  | {
      kind: "delete";
      table: string;
      id: string;
    }
  | {
      kind: "insert";
      table: string;
    }
  | {
      kind: "org";
      table: string;
    };

/**
 * Determines which database record(s) an agent action modifies.
 *
 * IMPORTANT:
 * Every state-changing AgentAction should appear here.
 *
 * If a new action is added to site-agent.ts but not added here, it will not
 * receive automatic undo protection.
 */
export function targetOf(action: AgentAction): Target | null {
  switch (action.type) {
    /*
     * SECTION ACTIONS
     */
    case "set_section_text":
    case "set_section_visibility":
    case "set_section_variant":
    case "set_section_effect":
    case "set_section_visual":
      return {
        kind: "update",
        table: "website_sections",
        id: action.sectionId,
      };

    case "reorder_sections":
      return {
        kind: "updateMany",
        table: "website_sections",
        ids: [...action.sectionIds],
      };

    case "delete_section":
      return {
        kind: "delete",
        table: "website_sections",
        id: action.sectionId,
      };

    case "add_section":
      return {
        kind: "insert",
        table: "website_sections",
      };

    /*
     * COMPONENT ACTIONS
     */
    case "set_component":
    case "set_component_visual":
      return {
        kind: "update",
        table: "website_components",
        id: action.componentId,
      };

    case "add_component":
      return {
        kind: "insert",
        table: "website_components",
      };

    case "delete_component":
      return {
        kind: "delete",
        table: "website_components",
        id: action.componentId,
      };

    /*
     * PAGE ACTIONS
     */
    case "add_page":
      return {
        kind: "insert",
        table: "website_pages",
      };

    case "set_page":
      return {
        kind: "update",
        table: "website_pages",
        id: action.pageId,
      };

    case "delete_page":
      return {
        kind: "delete",
        table: "website_pages",
        id: action.pageId,
      };

    /*
     * ORGANIZATION-LEVEL WEBSITE SETTINGS
     */
    case "set_theme":
    case "set_business_fact":
      return {
        kind: "org",
        table: "business_profiles",
      };

    case "set_backdrop":
      return {
        kind: "org",
        table: "website_settings",
      };

    default:
      return null;
  }
}

/**
 * Safely normalize a Supabase response error.
 */
function throwIfError(
  error: unknown,
  label: string,
): void {
  if (!error) return;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  throw new Error(`${label}: ${message}`);
}

/**
 * Capture the exact database state BEFORE an action executes.
 *
 * If the target row doesn't exist, the function returns no undo operation
 * rather than inventing state.
 */
export async function captureUndo(
  client: JournalClient,
  orgId: string,
  action: AgentAction,
): Promise<UndoStep[]> {
  const target = targetOf(action);

  if (!target) {
    return [];
  }

  const table = target.table;

  /*
   * SINGLE-ROW UPDATE OR DELETE
   */
  if (
    target.kind === "update" ||
    target.kind === "delete"
  ) {
    const result = await client
      .from(table)
      .select("*")
      .eq("id", target.id)
      .eq("organization_id", orgId)
      .maybeSingle();

    throwIfError(
      result.error,
      `${action.type}: unable to capture existing row`,
    );

    const row = (result.data ?? null) as Row | null;

    if (!row) {
      return [];
    }

    /*
     * UPDATE → restore previous values.
     */
    if (target.kind === "update") {
      return [
        {
          label: `${action.type}:restore`,
          run: async () => {
            const result = await client
              .from(table)
              .update(restorable(row))
              .eq("id", target.id)
              .eq("organization_id", orgId);

            throwIfError(
              result.error,
              `${action.type}: rollback update failed`,
            );
          },
        },
      ];
    }

    /*
     * DELETE → reinsert the original row.
     */
    return [
      {
        label: `${action.type}:reinsert`,
        run: async () => {
          const result = await client
            .from(table)
            .insert(row);

          throwIfError(
            result.error,
            `${action.type}: rollback reinsert failed`,
          );
        },
      },
    ];
  }

  /*
   * MULTI-ROW UPDATE
   */
  if (target.kind === "updateMany") {
    if (target.ids.length === 0) {
      return [];
    }

    const result = await client
      .from(table)
      .select("*")
      .eq("organization_id", orgId)
      .in("id", target.ids);

    throwIfError(
      result.error,
      `${action.type}: unable to capture rows`,
    );

    const rows = (result.data ?? []) as Row[];

    return rows.map((row) => {
      const id = String(row["id"]);

      return {
        label: `${action.type}:restore:${id}`,
        run: async () => {
          const result = await client
            .from(table)
            .update(restorable(row))
            .eq("id", id)
            .eq("organization_id", orgId);

          throwIfError(
            result.error,
            `${action.type}: rollback row ${id} failed`,
          );
        },
      };
    });
  }

  /*
   * ORGANIZATION-LEVEL RECORD
   */
  if (target.kind === "org") {
    const result = await client
      .from(table)
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    throwIfError(
      result.error,
      `${action.type}: unable to capture organization state`,
    );

    const row = (result.data ?? null) as Row | null;

    /*
     * If no organization-level row existed before the operation,
     * rollback should remove the newly-created row.
     */
    if (!row) {
      return [
        {
          label: `${action.type}:remove-created-org-row`,
          run: async () => {
            const result = await client
              .from(table)
              .delete()
              .eq("organization_id", orgId);

            throwIfError(
              result.error,
              `${action.type}: rollback delete failed`,
            );
          },
        },
      ];
    }

    /*
     * Otherwise restore the original organization-level state.
     */
    return [
      {
        label: `${action.type}:restore-org-state`,
        run: async () => {
          const result = await client
            .from(table)
            .update(restorable(row))
            .eq("organization_id", orgId);

          throwIfError(
            result.error,
            `${action.type}: rollback organization state failed`,
          );
        },
      },
    ];
  }

  /*
   * INSERT ACTIONS
   *
   * Record the IDs that existed before the insert.
   *
   * During rollback, only rows that:
   *
   *   1. belong to this organization
   *   2. were created after the operation started
   *   3. did not exist before the operation
   *
   * are candidates for deletion.
   *
   * This prevents rollback from deleting an unrelated pre-existing row.
   */
  const beforeResult = await client
    .from(table)
    .select("id")
    .eq("organization_id", orgId);

  throwIfError(
    beforeResult.error,
    `${action.type}: unable to capture pre-insert state`,
  );

  const before = new Set(
    ((beforeResult.data ?? []) as Row[]).map((row) =>
      String(row["id"]),
    ),
  );

  const startedAt = new Date().toISOString();

  return [
    {
      label: `${action.type}:delete-new-rows`,
      run: async () => {
        const afterResult = await client
          .from(table)
          .select("id, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", startedAt);

        throwIfError(
          afterResult.error,
          `${action.type}: rollback lookup failed`,
        );

        const candidates = (
          (afterResult.data ?? []) as Row[]
        ).filter((candidate) => {
          const id = String(candidate["id"]);
          return !before.has(id);
        });

        for (const candidate of candidates) {
          const id = String(candidate["id"]);

          const result = await client
            .from(table)
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId);

          throwIfError(
            result.error,
            `${action.type}: rollback delete ${id} failed`,
          );
        }
      },
    },
  ];
}

/**
 * Execute rollback operations in reverse order.
 *
 * We deliberately attempt every rollback step even if one fails.
 *
 * Example:
 *
 *   A succeeds
 *   B succeeds
 *   C fails
 *
 * rollback:
 *
 *   B restore
 *   A restore
 *
 * If B restoration fails, A is still attempted.
 */
export async function rollback(
  steps: UndoStep[],
): Promise<{
  undone: number;
  failed: number;
}> {
  let undone = 0;
  let failed = 0;

  for (const step of [...steps].reverse()) {
    try {
      await step.run();
      undone += 1;
    } catch (error) {
      failed += 1;

      console.error(
        "[site-agent] rollback step failed",
        {
          label: step.label,
          error,
        },
      );
    }
  }

  return {
    undone,
    failed,
  };
}

/**
 * Capture a journal for an entire action plan.
 *
 * This is useful when the builder is executing multiple customer changes
 * together.
 */
export async function capturePlanUndo(
  client: JournalClient,
  orgId: string,
  actions: AgentAction[],
): Promise<UndoStep[]> {
  const journal: UndoStep[] = [];

  for (const action of actions) {
    const steps = await captureUndo(
      client,
      orgId,
      action,
    );

    journal.push(...steps);
  }

  return journal;
}

/**
 * Returns whether an action is covered by the atomic journal.
 *
 * This can be used by validation/tests to prevent new state-changing actions
 * from silently bypassing undo support.
 */
export function isJournaledAction(
  action: AgentAction,
): boolean {
  return targetOf(action) !== null;
}

/**
 * Human-readable debugging information for builder telemetry.
 */
export function describeActionTarget(
  action: AgentAction,
): string {
  const target = targetOf(action);

  if (!target) {
    return `${action.type}:no-database-target`;
  }

  if ("id" in target) {
    return `${action.type}:${target.table}:${target.id}`;
  }

  if ("ids" in target) {
    return `${action.type}:${target.table}:${target.ids.join(",")}`;
  }

  return `${action.type}:${target.table}`;
}