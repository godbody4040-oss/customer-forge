/**
 * LAYER 2 in the builder: the "Run visual check" control.
 *
 * The website is loaded in a hidden frame on the owner's own browser, resized
 * through eleven phone and desktop widths, and measured for real — sideways
 * scrolling, broken pictures, cut-off text, buttons a thumb can't hit. The raw
 * measurements go to the server, which grades them itself and stores the
 * verdict the launch gate reads.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MonitorCheck } from "lucide-react";
import { toast } from "sonner";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { measureWebsiteAtAllWidths } from "@/lib/builder/visual-measure";
import type { VisualReport } from "@/lib/builder/visual";
import { recordVisualCheck } from "@/lib/visual-check.functions";
import { useCreatePreviewLink, usePreviewLinks } from "@/lib/website-content.hooks";
import { friendlyError } from "@/lib/user-error";

export function VisualCheckPanel({
  organizationId,
  slug,
  publishState,
  canManage,
}: {
  organizationId: string | undefined;
  slug: string | undefined;
  publishState: string | null | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: links } = usePreviewLinks(organizationId);
  const createLink = useCreatePreviewLink(organizationId);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<VisualReport | null>(null);

  const run = async () => {
    if (!organizationId || !slug || running) return;
    setRunning(true);
    setResult(null);
    try {
      // Published sites are measured at their public address; drafts through a
      // private preview link, reusing an active one when it exists.
      let path = `/s/${slug}`;
      if (publishState !== "published") {
        const active = (links ?? []).find(
          (link) => !link.revoked && new Date(link.expires_at).getTime() > Date.now(),
        );
        const token =
          active?.token ?? (await createLink.mutateAsync({ label: "Visual check", hours: 24 }));
        path = `/p/${token}`;
      }
      const measurements = await measureWebsiteAtAllWidths(path, (done, total) =>
        setProgress({ done, total }),
      );
      const saved = await recordVisualCheck({
        data: { organizationId, pageUrl: path, measurements },
      });
      setResult(saved.report);
      if (saved.report.passed) {
        toast.success(`Visual check passed — score ${saved.report.score}/100.`);
      } else {
        toast.error("The visual check found problems that must be fixed before launch.");
      }
      void queryClient.invalidateQueries({ queryKey: ["production-readiness"] });
      void queryClient.invalidateQueries({ queryKey: ["production-status"] });
      void queryClient.invalidateQueries({ queryKey: ["build-readiness"] });
    } catch (error) {
      toast.error(friendlyError(error, "The visual check couldn't run. Please try again."));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeading eyebrow="Real-browser check" title="See it the way visitors do" />
          <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
            Revora opens your website on this device and measures it at eleven phone and desktop
            widths — checking for sideways scrolling, broken pictures, cut-off text and buttons
            that are hard to tap. Publishing stays locked until this passes at 95 or better.
          </p>
          {result ? (
            <div className="mt-3 space-y-1.5">
              <Pill tone={result.passed ? "signal" : "attention"}>
                Score {result.score}/100 — {result.passed ? "passed" : "needs fixes"}
              </Pill>
              {result.findings.slice(0, 4).map((finding, index) => (
                <p key={index} className="text-[12px] text-muted-foreground">
                  {finding.detail} {finding.fix}
                </p>
              ))}
            </div>
          ) : null}
          {progress ? (
            <p className="mt-2 text-[12px] text-muted-foreground" role="status">
              Measuring size {progress.done} of {progress.total}…
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Button variant="outline" onClick={() => void run()} disabled={running || !slug}>
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MonitorCheck className="size-4" />
            )}
            {running ? "Checking…" : "Run visual check"}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
