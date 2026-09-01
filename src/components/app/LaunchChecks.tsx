import { AlertTriangle, CheckCircle2, Circle, Globe, Loader2 } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import type { QaCheck } from "@/lib/website-content";
import { revoraSubdomain } from "@/lib/website-plan";

const STATE_LABELS: Record<
  string,
  { label: string; help: string; tone: "signal" | "attention" | "neutral" | "info" }
> = {
  draft: { label: "Draft", help: "Only you can see this website.", tone: "neutral" },
  preview: { label: "Preview", help: "Ready for you to review before it goes live.", tone: "info" },
  published: { label: "Live", help: "Your website is publicly available.", tone: "signal" },
  unpublished: {
    label: "Taken offline",
    help: "The website is hidden from visitors.",
    tone: "attention",
  },
};

/**
 * Pre-launch QA and publishing. Publishing is blocked — and never reported as
 * successful — until every blocking check actually passes.
 */
export function LaunchChecks({
  checks,
  blockers,
  passed,
  publishState,
  lastPublishedAt,
  slug,
  canManage,
  isPublishing,
  onPublish,
  onUnpublish,
}: {
  checks: QaCheck[];
  blockers: QaCheck[];
  passed: boolean;
  publishState: string;
  lastPublishedAt: string | null;
  slug: string | undefined;
  canManage: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const state = STATE_LABELS[publishState] ?? STATE_LABELS["draft"]!;
  const live = publishState === "published";

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionHeading eyebrow="Publishing" title={state.label} />
            <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{state.help}</p>
            {slug ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                Free Revora address: {revoraSubdomain(slug)}
                {live ? "" : " (active once published)"}
              </p>
            ) : null}
            {lastPublishedAt ? (
              <p className="mt-1 text-[12px] text-muted-foreground">
                Last published {new Date(lastPublishedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={state.tone}>{state.label}</Pill>
            {canManage ? (
              live ? (
                <Button variant="outline" onClick={onUnpublish} disabled={isPublishing}>
                  Take offline
                </Button>
              ) : (
                <Button variant="signal" onClick={onPublish} disabled={isPublishing || !passed}>
                  {isPublishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Globe className="size-4" />
                  )}
                  Publish my website
                </Button>
              )
            ) : null}
          </div>
        </div>

        {!passed ? (
          <div
            role="status"
            className="mt-4 flex gap-2.5 rounded-md border border-accent/30 bg-accent/10 p-3.5 text-[13px] text-accent"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {blockers.length} item{blockers.length === 1 ? "" : "s"} must be finished before
              Revora can publish this website. Nothing is live until they pass.
            </span>
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Quality checks" title="What Revora verified" />
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {checks.map((check) => (
            <li key={check.key} className="flex gap-2.5">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Circle
                  className={
                    check.severity === "blocker"
                      ? "mt-0.5 size-4 shrink-0 text-accent"
                      : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                  }
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0">
                <p className="text-[13px]">{check.label}</p>
                {!check.ok ? (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {check.severity === "blocker" ? "Required — " : "Recommended — "}
                    {check.fix}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
