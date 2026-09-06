/**
 * The builder's front door: one premium request box that actually builds.
 *
 * Typing a request here plans the change with Revora's engine (native rules
 * first, a real AI model when one is configured for this server), then applies
 * it to the draft as soon as the plan is safe — nothing removed, nothing
 * missing. Anything risky waits for one explicit "Build it" press, and a
 * version is always saved first so it can be rolled back.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Mic, Image as ImageIcon, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/assistant-bridge";
import { BUILDER_QUICK_ACTIONS } from "@/lib/builder-modes";
import { applyWebsiteChanges, planWebsiteChanges } from "@/lib/site-agent.functions";
import type { AgentStep } from "@/lib/site-agent";
import { friendlyError } from "@/lib/user-error";
import { cn } from "@/lib/utils";

const INSTRUCTION_LIMIT = 1200;

type PanelPlan = {
  reply: string;
  summary: string;
  steps: AgentStep[];
  questions: string[];
  retryable: boolean;
};

export function AiRequestPanel({
  organizationId,
  canManage,
  onOpenAi,
  compact = false,
}: {
  organizationId: string | null;
  canManage: boolean;
  /** Switch to the AI workspace, where uploads, voice and history live. */
  onOpenAi: () => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [howOpen, setHowOpen] = useState(false);
  const [plan, setPlan] = useState<PanelPlan | null>(null);
  const [lastRequest, setLastRequest] = useState("");
  const queryClient = useQueryClient();

  const planFn = useServerFn(planWebsiteChanges);
  const applyFn = useServerFn(applyWebsiteChanges);

  const ready = canManage && Boolean(organizationId);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["website_content", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["website-versions", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["business-profile", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["build_readiness"] });
  };

  const build = useMutation({
    mutationFn: (steps: AgentStep[]) =>
      applyFn({
        data: {
          organizationId: organizationId!,
          actions: steps.map((step) => step.action),
          label: (plan?.summary || lastRequest).slice(0, 110) || "Before Revora changes",
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `${result.applied} change${result.applied === 1 ? "" : "s"} applied to your draft.` +
          (result.failed ? ` ${result.failed} couldn't be applied.` : ""),
      );
      setPlan(null);
      refresh();
    },
    onError: (error: Error) => toast.error(friendlyError(error, "Couldn't apply those changes.")),
  });

  const ask = useMutation({
    mutationFn: (instruction: string) => {
      setLastRequest(instruction);
      return planFn({
        data: { organizationId: organizationId!, instruction, history: [], attachments: [] },
      });
    },
    onSuccess: (result) => {
      const steps = result.steps as AgentStep[];
      const next: PanelPlan = {
        reply: result.reply,
        summary: result.summary,
        steps,
        questions: result.questions ?? [],
        retryable: Boolean(result.unavailable?.retryable),
      };
      setPlan(next);
      setValue("");
      const safe =
        steps.length > 0 && !steps.some((step) => step.destructive) && !next.questions.length;
      if (safe && !result.unavailable) build.mutate(steps);
    },
    onError: (error: Error) =>
      toast.error(friendlyError(error, "Revora couldn't read that request yet.")),
  });

  const busy = ask.isPending || build.isPending;

  const send = (instruction: string) => {
    const text = instruction.trim().slice(0, INSTRUCTION_LIMIT);
    if (!text || !ready || busy) return;
    ask.mutate(text);
  };

  const status = useMemo(() => {
    if (ask.isPending) return "Working out exactly what to change…";
    if (build.isPending) return "Building it on your draft…";
    return null;
  }, [ask.isPending, build.isPending]);

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="text-[15px] font-medium">Tell Revora what you want.</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Describe the result in your own words. Revora plans the changes, builds them on your draft,
        and saves a version first so you can undo anything.
      </p>

      <Textarea
        className="mt-3 min-h-24 text-[13px]"
        placeholder="Describe what you want to change…"
        aria-label="Describe what you want to change"
        value={value}
        maxLength={INSTRUCTION_LIMIT}
        disabled={!ready || busy}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send(value);
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="signal"
          disabled={!ready || busy || !value.trim()}
          onClick={() => send(value)}
        >
          {busy ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="mr-1.5 size-4" aria-hidden />
          )}
          {busy ? "Working…" : "Ask Revora"}
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenAi} disabled={!ready}>
          <ImageIcon className="mr-1.5 size-4" aria-hidden /> Add photo or video
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenAi} disabled={!ready}>
          <Mic className="mr-1.5 size-4" aria-hidden /> Speak
        </Button>
      </div>

      {status ? (
        <p className="mt-3 text-[12px] text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}

      {plan ? (
        <div className="mt-4 rounded-lg border border-border bg-elevated/40 p-3">
          <p className="text-[13px]">{plan.reply}</p>
          {plan.steps.length ? (
            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
              {plan.steps.slice(0, 8).map((step) => (
                <li key={step.key}>
                  • {step.title} <span className="opacity-70">({step.where})</span>
                </li>
              ))}
            </ul>
          ) : null}
          {plan.questions.length ? (
            <ul className="mt-2 space-y-1 text-[12px]">
              {plan.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.steps.length ? (
              <Button
                size="sm"
                variant="signal"
                disabled={busy}
                onClick={() => build.mutate(plan.steps)}
              >
                Build it
              </Button>
            ) : null}
            {plan.retryable ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => send(lastRequest)}>
                Retry
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPlan(null)}>
              Dismiss
            </Button>
            <Button size="sm" variant="ghost" onClick={onOpenAi}>
              Continue in chat
            </Button>
          </div>
        </div>
      ) : null}

      {compact ? null : (
        <div className="mt-4">
          <p className="eyebrow">Popular requests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BUILDER_QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={!ready || busy}
                onClick={() => send(action.instruction)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors",
                  "hover:bg-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={howOpen}
          onClick={() => setHowOpen((open) => !open)}
          className="flex cursor-pointer items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          How it works
          <ChevronDown className={cn("size-3.5 transition-transform", howOpen && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={() => {
            onOpenAi();
            if (lastRequest) askAssistant(lastRequest);
          }}
          className="cursor-pointer text-[12px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Open the full assistant
        </button>
      </div>
      {howOpen ? (
        <ol className="mt-2 space-y-1 text-[12px] text-muted-foreground">
          <li>1. Revora reads your request and your real business details.</li>
          <li>2. It works out the exact changes and applies safe ones straight away.</li>
          <li>3. Anything that removes content waits for you to press Build it.</li>
          <li>4. Every change lands on your draft, never on your live site.</li>
          <li>5. A version is saved first, so you can undo or roll back any time.</li>
        </ol>
      ) : null}
    </section>
  );
}
