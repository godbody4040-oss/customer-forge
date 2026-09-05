import { describe, expect, it } from "vitest";

import { captureUndo, rollback, targetOf, type JournalClient } from "@/lib/site-agent.atomic";
import type { AgentAction } from "@/lib/site-agent";

/**
 * A tiny stand-in for the Supabase query builder: it records every call so a
 * test can prove exactly which reversal was issued, without a database.
 */
function fakeClient(rows: Record<string, Record<string, unknown>[]>) {
  const calls: { table: string; op: string; values?: unknown; filters: [string, unknown][] }[] = [];

  const builder = (table: string, op: string, values?: unknown) => {
    const filters: [string, unknown][] = [];
    const entry = { table, op, values, filters };
    calls.push(entry);
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const key of ["eq", "in", "gte", "order", "limit"]) {
      chain[key] = (column: string, value: unknown) => {
        filters.push([`${key}:${column}`, value]);
        return self();
      };
    }
    chain["maybeSingle"] = async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null });
    chain["select"] = () => chain;
    chain["then"] = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
    return chain;
  };

  const client: JournalClient = {
    from: (table: string) =>
      ({
        select: () => builder(table, "select"),
        insert: (values: Record<string, unknown>) => builder(table, "insert", values),
        update: (values: Record<string, unknown>) => builder(table, "update", values),
        delete: () => builder(table, "delete"),
      }) as never,
  };

  return { client, calls };
}

const ORG = "11111111-1111-1111-1111-111111111111";

describe("site agent atomic journal", () => {
  it("maps each action to the row it touches", () => {
    expect(
      targetOf({
        type: "set_section_text",
        sectionId: "s1",
        field: "heading",
        value: "x",
      } as never),
    ).toEqual({ kind: "update", table: "website_sections", id: "s1" });
    expect(
      targetOf({ type: "add_page", kind: "about", title: "About", slug: "about" } as never),
    ).toEqual({ kind: "insert", table: "website_pages" });
    expect(targetOf({ type: "delete_component", componentId: "c1" } as never)).toEqual({
      kind: "delete",
      table: "website_components",
      id: "c1",
    });
  });

  it("restores the previous values of an updated row and never rewrites its identity", async () => {
    const { client, calls } = fakeClient({
      website_sections: [
        {
          id: "s1",
          organization_id: ORG,
          created_at: "2026-01-01",
          heading: "Original heading",
          is_visible: true,
        },
      ],
    });
    const steps = await captureUndo(client, ORG, {
      type: "set_section_text",
      sectionId: "s1",
      field: "heading",
      value: "New heading",
    } as AgentAction);

    expect(steps).toHaveLength(1);
    await rollback(steps);

    const update = calls.find((call) => call.op === "update");
    expect(update?.table).toBe("website_sections");
    expect(update?.values).toEqual({ heading: "Original heading", is_visible: true });
    expect(update?.filters).toEqual([
      ["eq:id", "s1"],
      ["eq:organization_id", ORG],
    ]);
  });

  it("puts a deleted row back exactly as it was", async () => {
    const row = { id: "c1", organization_id: ORG, kind: "button", label: "Call now" };
    const { client, calls } = fakeClient({ website_components: [row] });
    await rollback(
      await captureUndo(client, ORG, {
        type: "delete_component",
        componentId: "c1",
      } as AgentAction),
    );
    const insert = calls.find((call) => call.op === "insert");
    expect(insert?.table).toBe("website_components");
    expect(insert?.values).toEqual(row);
  });

  it("removes only rows created by the run when an insert has to be undone", async () => {
    const { client, calls } = fakeClient({
      website_pages: [{ id: "p1", organization_id: ORG, created_at: "2026-01-01" }],
    });
    const steps = await captureUndo(client, ORG, {
      type: "add_page",
      kind: "about",
      title: "About",
      slug: "about",
    } as AgentAction);
    await rollback(steps);
    // The only page the fake database reports already existed before the run, so
    // the reversal must delete nothing at all.
    expect(calls.filter((call) => call.op === "delete")).toHaveLength(0);
  });

  it("keeps going when one reversal step fails and reports it", async () => {
    const result = await rollback([
      {
        label: "broken",
        run: async () => {
          throw new Error("no");
        },
      },
      { label: "fine", run: async () => {} },
    ]);
    expect(result).toEqual({ undone: 1, failed: 1 });
  });
});
