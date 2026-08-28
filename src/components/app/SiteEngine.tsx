import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, History, Loader2, RotateCcw, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { MetricCard, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GENERATION_STEPS, stepLabel } from "@/lib/site-engine";
import type { Recommendation, ScoreFactor } from "@/lib/site-engine";
import {
  useAiCopyEdit,
  useLatestGenerationJob,
  useRestoreWebsiteVersion,
  useRunSiteEngine,
  useSnapshotWebsiteVersion,
  useWebsiteVersions,
} from "@/lib/site-engine.hooks";
import { dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ---------------------------- generation progress ---------------------------- */

export function SiteEnginePanel({
  organizationId,
  canManage,
  hasCopy,
}: {
  organizationId: string | undefined;
  canManage: boolean;
  hasCopy: boolean;
}) {
  const { data: job } = useLatestGenerationJob(organizationId);
  const run = useRunSiteEngine(organizationId);

  const status = run.isPending ? "processing" : ((job?.status as string | undefined) ?? "none");
  const doneSteps = Array.isArray(job?.steps) ? (job?.steps as string[]) : [];
  const progress = run.isPending && !doneSteps.length ? 5 : Number(job?.progress ?? 0);
  const running = status === "processing" || status === "queued";

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeading
            eyebrow="Revora Site Engine"
            title={
              running
                ? "Revora is building your website…"
                : status === "failed"
                  ? "The last build didn't finish"
                  : hasCopy
                    ? "Your website is built from your information"
                    : "Build your website"
            }
          />
          <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
            The engine reads the details you entered, picks the right structure for your industry and
            writes the page copy. It never invents reviews, awards, credentials or prices.
          </p>
        </div>
        {canManage ? (
          <Button variant={hasCopy ? "outline" : "signal"} disabled={running} onClick={() => run.mutate()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {status === "failed" ? "Retry build" : hasCopy ? "Rebuild from my info" : "Generate my website"}
          </Button>
        ) : null}
      </div>

      {status === "failed" && job?.error_message ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/5 p-3.5">
          <TriangleAlert className="mt-0.5 size-4 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium">Generation failed</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{String(job.error_message)}</p>
          </div>
        </div>
      ) : null}

      {status !== "none" ? (
        <>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-elevated" role="presentation">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.max(progress, running ? 5 : progress)}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground" aria-live="polite">
            {running ? `${stepLabel(job?.current_step as string | null)}…` : `${progress}% complete`}
          </p>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {GENERATION_STEPS.map((step) => {
              const complete = doneSteps.includes(step.key) || status === "completed";
              const active = running && job?.current_step === step.key;
              return (
                <li
                  key={step.key}
                  className={cn(
                    "flex items-center gap-2 text-[12px]",
                    complete ? "text-muted-foreground" : active ? "" : "text-muted-foreground/60",
                  )}
                >
                  <span aria-hidden="true" className={complete ? "text-primary" : "text-muted-foreground/60"}>
                    {complete ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : "•"}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}

/* ------------------------------ AI edit assistant ------------------------------ */

const EXAMPLES = [
  "Make my homepage sound more luxurious.",
  "Make this shorter and more direct.",
  "Add more urgency to the main button.",
  "Rewrite my service descriptions.",
];

export function AiCopyAssistant({
  organizationId,
  fields,
  onApply,
  canManage,
}: {
  organizationId: string | undefined;
  fields: Record<string, string>;
  onApply: (patch: Record<string, string>) => void;
  canManage: boolean;
}) {
  const edit = useAiCopyEdit(organizationId);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<Record<string, string> | null>(null);

  if (!canManage) return null;

  const usable = Object.entries(fields).filter(([, v]) => v && v.trim().length);

  return (
    <Panel className="p-5">
      <SectionHeading eyebrow="AI assistant" title="Ask Revora to rewrite your copy" />
      <p className="mt-2 text-[13px] text-muted-foreground">
        Revora only changes the wording you ask about — your structure, services and contact details stay
        exactly as they are.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!instruction.trim() || !usable.length) return;
          edit.mutate(
            { instruction: instruction.trim(), fields: Object.fromEntries(usable) },
            { onSuccess: (result) => setPreview(result) },
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ai-instruction">What should change?</Label>
          <Input
            id="ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make my homepage sound more premium"
            maxLength={400}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setInstruction(example)}
              className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-elevated"
            >
              {example}
            </button>
          ))}
        </div>
        <Button type="submit" variant="signal" disabled={edit.isPending || !usable.length}>
          {edit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          Rewrite copy
        </Button>
        {!usable.length ? (
          <p className="text-[12px] text-muted-foreground">Generate your website first so there's copy to edit.</p>
        ) : null}
      </form>

      {preview ? (
        <div className="mt-5 space-y-3 rounded-md border border-border p-4">
          <p className="text-[13px] font-medium">Suggested wording</p>
          {Object.entries(preview).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="text-[13px]">{value}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="signal"
              size="sm"
              onClick={() => {
                onApply(preview);
                setPreview(null);
              }}
            >
              Use this copy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/* -------------------------------- Revora score -------------------------------- */

export function RevoraScorePanel({
  score,
  factors,
  recommendations,
}: {
  score: number;
  factors: ScoreFactor[];
  recommendations: Recommendation[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <MetricCard
        label="Revora score"
        value={`${score}/100`}
        hint={score >= 85 ? "Strong — keep it fresh" : "Complete the items to improve"}
        tone={score >= 85 ? "signal" : "attention"}
        progress={score}
      />
      <Panel className="p-5 lg:col-span-2">
        <SectionHeading eyebrow="Grow my business" title="What to do next" />
        <ul className="mt-4 space-y-2.5">
          {recommendations.map((rec) => (
            <li key={rec.key} className="rounded-md border border-border p-3.5">
              <p className="text-[13px] font-medium">{rec.title}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{rec.detail}</p>
              {rec.to ? (
                <Link to={rec.to} className="mt-1.5 inline-block text-[12px] text-primary underline-offset-2 hover:underline">
                  Fix this
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {factors.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-2 text-[12px]">
              <span className={f.points >= f.max ? "text-muted-foreground" : ""}>{f.label}</span>
              <span className={f.points >= f.max ? "text-primary" : "text-accent"}>
                {Math.round(Math.min(f.points, f.max))}/{f.max}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------ version history ------------------------------ */

export function VersionHistory({
  organizationId,
  canManage,
}: {
  organizationId: string | undefined;
  canManage: boolean;
}) {
  const { data: versions } = useWebsiteVersions(organizationId);
  const snapshot = useSnapshotWebsiteVersion(organizationId);
  const restore = useRestoreWebsiteVersion(organizationId);
  const [label, setLabel] = useState("");

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading eyebrow="Version control" title={`${(versions ?? []).length} saved versions`} />
        {canManage ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              snapshot.mutate(label.trim() || undefined, { onSuccess: () => setLabel("") });
            }}
          >
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Version note (optional)"
              className="h-9 w-48"
            />
            <Button type="submit" size="sm" variant="outline" disabled={snapshot.isPending}>
              <History className="size-4" /> Save version
            </Button>
          </form>
        ) : null}
      </div>

      {(versions ?? []).length === 0 ? (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Saving a version snapshots your current structure, copy and SEO. Editing the draft afterwards never
          changes a saved version.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {(versions ?? []).map((v) => (
            <li key={String(v.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-[13px] font-medium">
                  Version {String(v.version)}{" "}
                  {v.label && v.label !== `Version ${v.version}` ? (
                    <span className="text-muted-foreground">· {String(v.label)}</span>
                  ) : null}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Saved {dateShort(String(v.created_at))} · template {String(v.template ?? "default")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {v.published_at ? <Pill tone="signal">Published</Pill> : <Pill tone="neutral">Snapshot</Pill>}
                {canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restore.isPending}
                    onClick={() => restore.mutate(String(v.id))}
                  >
                    <RotateCcw className="size-4" /> Restore
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
