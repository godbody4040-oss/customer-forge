import { RotateCcw, Save } from "lucide-react";
import { Panel, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { dateShort } from "@/lib/format";
import { countSnapshot } from "@/lib/site-restore";
import { useRestorePoint } from "@/lib/site-restore.hooks";

/**
 * Exact rollback. A restore point copies the whole website — pages, sections,
 * every element, links and settings — so an AI change or a manual experiment
 * can be undone completely, not approximately.
 */
export function RestorePointPanel({
  organizationId,
  canManage,
}: {
  organizationId: string | undefined;
  canManage: boolean;
}) {
  const { point, save, rollback, clear } = useRestorePoint(organizationId);
  const counts = point ? countSnapshot(point.snapshot) : null;

  return (
    <Panel className="p-5">
      <SectionHeading
        eyebrow="Revora"
        title="Restore point"
        description="Save an exact copy before a big change, then put everything back in one click."
      />

      <p className="mt-3 text-sm text-muted-foreground">
        {point && counts
          ? `Saved ${dateShort(point.takenAt)} — ${counts.pages} pages, ${counts.sections} sections, ${counts.components} elements. Kept in this browser only.`
          : "No restore point saved yet. Save one before asking Revora for a large change."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canManage || !organizationId || save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving…" : point ? "Replace restore point" : "Save restore point"}
        </Button>
        <Button
          size="sm"
          disabled={!canManage || !point || rollback.isPending}
          onClick={() => rollback.mutate()}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {rollback.isPending ? "Restoring…" : "Restore exactly"}
        </Button>
        {point ? (
          <Button variant="ghost" size="sm" onClick={clear} disabled={rollback.isPending}>
            Forget it
          </Button>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Ask a workspace owner or admin to restore the website.
        </p>
      ) : null}
    </Panel>
  );
}
