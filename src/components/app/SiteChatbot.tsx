import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Bot, Check, Clapperboard, History, Loader2, Rocket, Send, Sparkles, Trash2, User } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { applyWebsiteChanges, planWebsiteChanges } from "@/lib/site-agent.functions";
import { AssistantMedia } from "@/components/app/AssistantMedia";
import {
  MULTIMODAL_TEMPLATES,
  PLAN_INSTRUCTION_LIMIT,
  QUICK_COMMANDS,
  type AgentAttachment,
  type AgentStep,
  type AgentTurn,
} from "@/lib/site-agent";

const EXAMPLES = [
  "Rewrite the whole home page to lead with same-day service and a clear price promise",
  "Add a pricing page with three packages and link it from the menu",
  "Make every headline shorter, then move the reviews above the services",
  "Write page titles and meta descriptions for every page",
];

const CHIP =
  "cursor-pointer rounded-full border border-border px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Message =
  | { role: "user"; content: string; attached?: string[] }
  | { role: "assistant"; content: string; plan?: Plan };

type Plan = {
  summary: string;
  steps: AgentStep[];
  questions: string[];
  notes: string[];
};

/**
 * The website agent. The client types anything — a sentence or a full brief —
 * and Revora returns a plan of concrete changes across pages, sections, items,
 * page settings, SEO and look-and-feel. The client approves, Revora writes it.
 *
 * A version snapshot is taken before anything is written, so any change can be
 * rolled back from version history.
 */
export function SiteChatbot({
  organizationId,
  canManage,
  hasSections,
  publishState,
  onPublishNow,
  isPublishing = false,
}: {
  organizationId: string | undefined;
  canManage: boolean;
  hasSections: boolean;
  publishState?: string | null;
  onPublishNow?: () => void;
  isPublishing?: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [transcripts, setTranscripts] = useState<{ at: string; text: string }[]>([]);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const ask = useServerFn(planWebsiteChanges);
  const applyFn = useServerFn(applyWebsiteChanges);

  const history: AgentTurn[] = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  const chosen = useMemo(() => (plan?.steps ?? []).filter((step) => !skipped.has(step.key)), [plan, skipped]);

  const propose = useMutation({
    mutationFn: (input: { text: string; attachments: AgentAttachment[] }) =>
      ask({
        data: {
          organizationId: organizationId!,
          instruction: input.text,
          history,
          attachments: input.attachments,
        },
      }),
    onSuccess: (result) => {
      setMessages((prior) => [
        ...prior,
        { role: "assistant", content: result.reply, plan: { summary: result.summary, steps: result.steps as AgentStep[], questions: result.questions, notes: result.notes } },
      ]);
      setPlan({ summary: result.summary, steps: result.steps as AgentStep[], questions: result.questions, notes: result.notes });
      setSkipped(new Set());
    },
    onError: (error: Error) =>
      setMessages((prior) => [
        ...prior,
        { role: "assistant", content: error.message || "I couldn't work that out. Try rewording it." },
      ]),
  });

  const apply = useMutation({
    mutationFn: () =>
      applyFn({
        data: {
          organizationId: organizationId!,
          actions: chosen.map((step) => step.action),
          label: plan?.summary?.slice(0, 110) || "Before assistant changes",
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `${result.applied} change${result.applied === 1 ? "" : "s"} applied to your website.` +
          (result.failed ? ` ${result.failed} couldn't be applied.` : ""),
      );
      setMessages((prior) => [
        ...prior,
        {
          role: "assistant",
          content:
            `Done — ${result.applied} change${result.applied === 1 ? "" : "s"} are live in your draft.` +
            ` I saved a version called "${result.snapshotLabel}" first, so you can roll back any time.` +
            (result.failed ? ` ${result.failed} step${result.failed === 1 ? "" : "s"} couldn't be applied.` : ""),
        },
      ]);
      setPlan(null);
      setSkipped(new Set());
      void queryClient.invalidateQueries({ queryKey: ["website_content", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["website-versions", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["business-profile", organizationId] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't apply those changes."),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = instruction.trim();
    if (text.length < 3 && !attachments.length) return;
    const sent = attachments;
    setMessages((prior) => [
      ...prior,
      {
        role: "user",
        content: text || "(see the attached file)",
        attached: sent.map(
          (attachment) =>
            `${attachment.kind === "image" ? "Photo" : attachment.kind === "video" ? "Video" : "Voice"}: ${attachment.name}` +
            (attachment.chapters?.length ? ` (${attachment.chapters.length} moments indexed)` : ""),
        ),
      },
    ]);
    setPlan(null);
    setSkipped(new Set());
    setInstruction("");
    setAttachments([]);
    propose.mutate({ text, attachments: sent });
  };

  const destructive = chosen.filter((step) => step.destructive).length;

  return (
    <Panel className="p-5">
      <SectionHeading
        eyebrow="Website assistant"
        title="Ask Revora to change anything on your site"
        action={
          messages.length ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([]);
                setPlan(null);
              }}
            >
              <Trash2 className="size-4" /> New chat
            </Button>
          ) : null
        }
      />
      <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
        Write as little or as much as you like — a single tweak or a full brief. Revora can rewrite copy, add and
        remove sections and pages, reorder the layout, edit items and buttons, write your search and social text, and
        change colours and fonts. Add photos or a short video, or just speak your request — Revora reads and listens too. You
        review the plan, then it's applied for you. No support request, no waiting.
      </p>

      {!hasSections ? (
        <p className="mt-4 text-[13px] text-accent">
          Build your pages and sections first, then the assistant can change anything on them.
        </p>
      ) : null}

      {messages.length ? (
        <div className="mt-5 space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 rounded-md border p-3.5 ${
                message.role === "user" ? "border-border" : "border-border bg-elevated/60"
              }`}
            >
              {message.role === "user" ? (
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Bot className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.content}</p>
                {message.role === "user" && message.attached?.length ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{message.attached.join(" · ")}</p>
                ) : null}
              </div>
            </div>
          ))}
          {propose.isPending ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-elevated/60 p-3.5 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              Reading your website and working out the changes…
            </div>
          ) : null}
        </div>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={submit}>
        <Textarea
          rows={messages.length ? 3 : 5}
          value={instruction}
          onChange={(event) => setInstruction(event.target.value.slice(0, PLAN_INSTRUCTION_LIMIT))}
          placeholder={
            "e.g. Rewrite the home page for emergency callouts, add an FAQ about pricing, move reviews above services, and write meta descriptions for every page."
          }
          disabled={!canManage || !hasSections}
          aria-label="Tell Revora what to change"
          className="min-h-[96px]"
        />
        <AssistantMedia
          organizationId={organizationId}
          attachments={attachments}
          onChange={setAttachments}
          onTranscript={(text) => {
            setTranscripts((prior) => [
              ...prior,
              { at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), text },
            ]);
            setInstruction((prior) => (prior ? `${prior.trim()} ${text}` : text).slice(0, PLAN_INSTRUCTION_LIMIT));
          }}
          onInsert={(text) =>
            setInstruction((prior) => (prior ? `${prior.trim()} ${text}` : text).slice(0, PLAN_INSTRUCTION_LIMIT))
          }
          disabled={!canManage || !hasSections}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="signal" disabled={!canManage || !hasSections || propose.isPending || (instruction.trim().length < 3 && !attachments.length)}>
            {propose.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {messages.length ? "Send" : "Ask Revora"}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {instruction.length.toLocaleString()} / {PLAN_INSTRUCTION_LIMIT.toLocaleString()} characters
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground" id="quick-commands-label">
            Quick commands — tap one, or say it out loud
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quick-commands-label">
            {QUICK_COMMANDS.map((command) => (
              <button
                key={command.label}
                type="button"
                disabled={!canManage || !hasSections}
                className={`${CHIP} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => setInstruction(command.instruction.slice(0, PLAN_INSTRUCTION_LIMIT))}
              >
                {command.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground" id="media-templates-label">
            Guided photo &amp; video briefs — attach the files, then send
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="media-templates-label">
            {MULTIMODAL_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                disabled={!canManage || !hasSections}
                title={`Attach: ${template.attach}`}
                className={`${CHIP} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => setInstruction(template.instruction.slice(0, PLAN_INSTRUCTION_LIMIT))}
              >
                <Clapperboard className="mr-1 inline size-3" aria-hidden="true" />
                {template.label}
                <span className="sr-only"> — attach {template.attach}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {MULTIMODAL_TEMPLATES.map((template) => `${template.label}: ${template.attach}`).join(" · ")}
          </p>
        </div>

        {!messages.length ? (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className={CHIP}
                onClick={() => setInstruction(example)}
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {transcripts.length ? (
          <section aria-label="Voice request transcripts" className="rounded-md border border-border p-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Voice transcripts — what Revora heard, in your words
            </p>
            <ul className="mt-1.5 space-y-1.5" aria-live="polite">
              {transcripts.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-[12px] leading-relaxed">
                  <span className="font-mono text-muted-foreground">{entry.at}</span>{" "}
                  <span className="whitespace-pre-wrap">“{entry.text}”</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${CHIP} mt-2`}
              onClick={() => setTranscripts([])}
            >
              Clear transcripts
            </button>
          </section>
        ) : null}
      </form>

      {plan ? (
        <div className="mt-5 space-y-3">
          {plan.questions.length ? (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-3.5">
              <p className="text-[12px] font-medium">Revora needs these facts before it can go further</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">
                {plan.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {plan.steps.length ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-muted-foreground">
                  {plan.steps.length} proposed change{plan.steps.length === 1 ? "" : "s"} — untick anything you don't
                  want
                </p>
                <Pill tone="info">
                  <Sparkles className="size-3" aria-hidden="true" /> {chosen.length} selected
                </Pill>
              </div>

              {plan.steps.map((step) => {
                const off = skipped.has(step.key);
                return (
                  <div
                    key={step.key}
                    className={`rounded-md border p-3.5 transition-opacity ${
                      off ? "border-border opacity-50" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={step.destructive ? "danger" : "info"}>{step.where}</Pill>
                      <p className="text-[13px] font-medium">{step.title}</p>
                    </div>
                    {step.before ? (
                      <p className="mt-2 text-[12px] text-muted-foreground line-through">{step.before}</p>
                    ) : null}
                    {step.after ? <p className="mt-1.5 whitespace-pre-wrap text-[13px]">{step.after}</p> : null}
                    <button
                      type="button"
                      className="mt-2.5 cursor-pointer text-[12px] text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() =>
                        setSkipped((prior) => {
                          const next = new Set(prior);
                          if (next.has(step.key)) next.delete(step.key);
                          else next.add(step.key);
                          return next;
                        })
                      }
                    >
                      {off ? "Include this change" : "Skip this change"}
                    </button>
                  </div>
                );
              })}

              {destructive ? (
                <p className="flex items-start gap-2 text-[12px] text-accent">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {destructive} step{destructive === 1 ? "" : "s"} remove or hide content. A version is saved first, so
                  you can roll back.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="signal"
                  disabled={!canManage || !chosen.length || apply.isPending}
                  onClick={() => apply.mutate()}
                >
                  {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Apply {chosen.length} change{chosen.length === 1 ? "" : "s"}
                </Button>
                <Button variant="outline" onClick={() => setPlan(null)} disabled={apply.isPending}>
                  Discard plan
                </Button>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <History className="size-3.5" aria-hidden="true" /> A rollback point is saved automatically
                </span>
              </div>
            </>
          ) : null}

          {plan.notes.length ? (
            <ul className="list-disc space-y-1 pl-4 text-[12px] text-muted-foreground">
              {plan.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {onPublishNow && publishState === "published" ? (
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border pt-4">
          <p className="text-[12px] text-muted-foreground">
            Changes go to your draft. Publish to put them on your live site.
          </p>
          <Button variant="outline" size="sm" onClick={onPublishNow} disabled={!canManage || isPublishing}>
            {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Publish now
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
