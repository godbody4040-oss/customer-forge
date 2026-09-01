import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/app/Bits";
import { cn } from "@/lib/utils";
import {
  GROWTH_COMMANDS,
  commandPlan,
  growthAudit,
  type AutoFixKey,
  type GrowthAuditInput,
  type GrowthFinding,
  type Severity,
} from "@/lib/growth-command";

const TONE: Record<Severity, { pill: "danger" | "attention" | "info" | "signal"; label: string }> =
  {
    critical: { pill: "danger", label: "Critical" },
    warning: { pill: "attention", label: "Needs work" },
    opportunity: { pill: "info", label: "Opportunity" },
    healthy: { pill: "signal", label: "Healthy" },
  };

const AUTO_LABEL: Record<AutoFixKey, string> = {
  generate_site: "Build with AI",
  apply_cta: "Apply drafted button",
  apply_meta: "Apply drafted SEO",
  publish_site: "Publish now",
};

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid size-24 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-primary) ${score * 3.6}deg, var(--color-border) 0deg)`,
        }}
        role="img"
        aria-label={`Revora Growth Score ${score} out of 100`}
      >
        <div className="grid size-[76px] place-items-center rounded-full bg-card">
          <span className="tnum font-display text-2xl font-bold">{score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="eyebrow">Revora Growth Score</p>
        <p className="mt-1 font-display text-lg font-semibold">{grade}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Measured from your real business facts, website structure and traffic — never estimates.
        </p>
      </div>
    </div>
  );
}

function FindingRow({
  finding,
  canManage,
  busy,
  onAutoFix,
}: {
  finding: GrowthFinding;
  canManage: boolean;
  busy: AutoFixKey | null;
  onAutoFix: (key: AutoFixKey) => void;
}) {
  const tone = TONE[finding.severity];
  return (
    <li className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium">{finding.title}</p>
          <Pill tone={tone.pill}>{tone.label}</Pill>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">{finding.evidence}</p>
        {finding.severity !== "healthy" ? (
          <p className="mt-1 text-[12px]">{finding.action}</p>
        ) : null}
      </div>
      {finding.severity !== "healthy" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {finding.autoFix && canManage ? (
            <Button
              size="sm"
              variant="signal"
              disabled={busy !== null}
              onClick={() => onAutoFix(finding.autoFix!)}
            >
              {busy === finding.autoFix ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="size-4" aria-hidden="true" />
              )}
              {AUTO_LABEL[finding.autoFix]}
            </Button>
          ) : null}
          {finding.to ? (
            <Button asChild size="sm" variant="outline">
              <Link to={finding.to}>
                Open <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
      )}
    </li>
  );
}

export function GrowthCommandCenter({
  input,
  canManage,
  isRefreshing,
  busyFix,
  onRefresh,
  onAutoFix,
}: {
  input: GrowthAuditInput;
  canManage: boolean;
  isRefreshing?: boolean;
  busyFix: AutoFixKey | null;
  onRefresh: () => void;
  onAutoFix: (key: AutoFixKey) => void;
}) {
  const audit = useMemo(() => growthAudit(input), [input]);
  const [commandKey, setCommandKey] = useState<string>("upgrade-all");
  const [showWins, setShowWins] = useState(false);

  const command = GROWTH_COMMANDS.find((c) => c.key === commandKey) ?? GROWTH_COMMANDS[0]!;
  const plan = commandPlan(command, audit);
  const criticals = audit.issues.filter((i) => i.severity === "critical").length;

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <ScoreRing score={audit.score} grade={audit.grade} />
          <div className="flex flex-wrap items-center gap-2">
            {criticals > 0 ? (
              <Pill tone="danger">
                {criticals} critical {criticals === 1 ? "issue" : "issues"}
              </Pill>
            ) : (
              <Pill tone="signal">No critical issues</Pill>
            )}
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              Re-run audit
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audit.categories.map((cat) => (
            <div key={cat.key} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium">{cat.label}</p>
                <span className="tnum text-[12px] text-muted-foreground">{cat.score}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full",
                    cat.score >= 75 ? "bg-primary" : "bg-accent",
                  )}
                  style={{ width: `${Math.max(cat.score, 2)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{cat.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-0">
        <div className="border-b border-border px-3.5 py-3">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" /> Ask Revora
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Pick a command. Revora analyses first, shows exactly what it would change, and only
            applies fixes you approve — your existing content is never overwritten without a saved
            version.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GROWTH_COMMANDS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCommandKey(c.key)}
                className={cn(
                  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-[12px] transition-colors",
                  c.key === commandKey
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={c.key === commandKey}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{command.intent}</p>
        </div>

        {plan.length ? (
          <ul className="divide-y divide-border">
            {plan.map((finding) => (
              <FindingRow
                key={finding.key}
                finding={finding}
                canManage={canManage}
                busy={busyFix}
                onAutoFix={onAutoFix}
              />
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-6 text-[13px] text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            Nothing to fix for this command right now.
          </div>
        )}
      </section>

      <section className="panel p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
          <p className="eyebrow flex items-center gap-2">
            {audit.issues.length ? (
              <AlertTriangle className="size-3.5 text-accent" aria-hidden="true" />
            ) : (
              <Lightbulb className="size-3.5 text-primary" aria-hidden="true" />
            )}
            Full audit
          </p>
          <Button size="sm" variant="ghost" onClick={() => setShowWins((v) => !v)}>
            {showWins ? "Hide what's working" : `Show what's working (${audit.wins.length})`}
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {(showWins ? audit.findings : audit.issues).map((finding) => (
            <FindingRow
              key={finding.key}
              finding={finding}
              canManage={canManage}
              busy={busyFix}
              onAutoFix={onAutoFix}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
