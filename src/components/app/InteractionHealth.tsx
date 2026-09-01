import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MousePointerClick, XCircle } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  type InteractionCheck,
  type InteractionStatus,
  interactionSummary,
  scanInteractions,
} from "@/lib/interaction-health";
import type { ContentPage } from "@/lib/website-content";

const TONE: Record<
  InteractionStatus,
  { label: string; tone: "signal" | "attention" | "neutral"; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Working", tone: "signal", Icon: CheckCircle2 },
  warn: { label: "Needs attention", tone: "attention", Icon: AlertTriangle },
  broken: { label: "Broken", tone: "attention", Icon: XCircle },
};

/**
 * Every-button verification for the client's website.
 *
 * The report is derived from the same content the public renderer reads, so
 * "working" here means the link actually resolves to a real page, section or
 * contact target — not that a control merely exists.
 */
export function InteractionHealth({
  pages,
  onFix,
}: {
  pages: ContentPage[];
  /** Jumps the builder to the page/section that owns a problem control. */
  onFix?: (check: InteractionCheck) => void;
}) {
  const report = useMemo(() => scanInteractions(pages), [pages]);
  const [showAll, setShowAll] = useState(false);

  const problems = report.checks.filter((check) => check.status !== "ok");
  const visible = showAll ? report.checks : problems;

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeading
            eyebrow="Button & link check"
            title={
              report.broken > 0
                ? `${report.broken} control${report.broken === 1 ? "" : "s"} won't work for visitors`
                : report.needsAttention > 0
                  ? "Every button works — a few could be better"
                  : "Every button and link works"
            }
          />
          <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
            {interactionSummary(report)}. We follow each button to its destination the same way a
            visitor's browser does.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={report.broken > 0 ? "attention" : "signal"}>
            {report.score}/100 clickable health
          </Pill>
          {report.checks.length > problems.length || showAll ? (
            <Button size="sm" variant="outline" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show problems only" : `Show all ${report.total}`}
            </Button>
          ) : null}
        </div>
      </div>

      {report.total === 0 ? (
        <p className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-[13px] text-muted-foreground">
          No buttons or links to check yet. Add a section with a call to action and this check runs
          automatically.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-[13px] text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          All {report.total} interactions resolve correctly. Nothing to fix before you publish.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((check) => {
            const tone = TONE[check.status];
            return (
              <li
                key={check.id}
                className="rounded-xl border border-border/60 bg-muted/10 p-3 text-[13px]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <tone.Icon
                        className={
                          check.status === "ok"
                            ? "size-4 shrink-0 text-primary"
                            : "size-4 shrink-0 text-destructive"
                        }
                        aria-hidden="true"
                      />
                      <span className="break-words">{check.label}</span>
                    </p>
                    <p className="mt-1 text-muted-foreground">{check.location}</p>
                    <p className="mt-1 text-muted-foreground">{check.detail}</p>
                    {check.fix ? (
                      <p className="mt-1 text-foreground/90">
                        <span className="text-muted-foreground">Fix: </span>
                        {check.fix}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Pill tone={tone.tone}>{tone.label}</Pill>
                    {check.status !== "ok" && onFix ? (
                      <Button size="sm" variant="outline" onClick={() => onFix(check)}>
                        <MousePointerClick className="size-3.5" aria-hidden="true" />
                        Open section
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
