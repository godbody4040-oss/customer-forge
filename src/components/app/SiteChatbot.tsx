import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Check, Loader2, Send, X } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiEditSiteSections } from "@/lib/site-engine.functions";
import { useApplySectionEdits, type SectionEdit } from "@/lib/website-content.hooks";
import { sectionLabel } from "@/lib/website-content";

const EXAMPLES = [
  "Make the headline shorter and mention same-day service",
  "Rewrite the about section in a friendlier tone",
  "Make the questions and answers easier to read",
];

/**
 * In-builder assistant. It proposes section changes and shows a before/after
 * for each one — nothing is written to the website until the owner confirms.
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
  const [reply, setReply] = useState<string | null>(null);
  const [pending, setPending] = useState<SectionEdit[]>([]);
  const ask = useServerFn(aiEditSiteSections);
  const apply = useApplySectionEdits(organizationId);

  const propose = useMutation({
    mutationFn: async (text: string) => ask({ data: { organizationId: organizationId!, instruction: text } }),
    onSuccess: (result) => {
      setReply(result.reply);
      setPending(result.edits as SectionEdit[]);
    },
    onError: (error: Error) => setReply(error.message || "I couldn't work that out. Try rewording it."),
  });

  return (
    <Panel className="p-5">
      <SectionHeading eyebrow="Website assistant" title="Ask Revora to change your site" />
      <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
        Describe the change in your own words and Revora edits your website for you. You approve the change —
        no request to support, no waiting on anyone. It never invents claims about your business.
      </p>

      {!hasSections ? (
        <p className="mt-4 text-[13px] text-accent">
          Build your pages and sections first, then the assistant can edit them.
        </p>
      ) : null}

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const text = instruction.trim();
          if (text.length < 4) return;
          setPending([]);
          propose.mutate(text);
        }}
      >
        <Textarea
          rows={3}
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="e.g. Make the headline mention that we come to the customer"
          disabled={!canManage || !hasSections}
          aria-label="Tell Revora what to change"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="signal" disabled={!canManage || !hasSections || propose.isPending}>
            {propose.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Ask Revora
          </Button>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-elevated"
              onClick={() => setInstruction(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {reply ? (
        <div className="mt-5 flex gap-3 rounded-md border border-border bg-elevated/60 p-3.5">
          <Bot className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed">{reply}</p>
        </div>
      ) : null}

      {pending.length ? (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] font-medium text-muted-foreground">
            {pending.length} proposed change{pending.length === 1 ? "" : "s"} — review before applying
          </p>
          {pending.map((edit, index) => (
            <div key={`${edit.sectionId}-${edit.field}-${index}`} className="rounded-md border border-border p-3.5">
              <div className="flex items-center gap-2">
                <Pill tone="info">{sectionLabel(edit.sectionLabel)}</Pill>
                <span className="text-[11px] text-muted-foreground">{edit.field}</span>
              </div>
              {edit.before ? (
                <p className="mt-2 text-[12px] text-muted-foreground line-through">{edit.before}</p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">(empty)</p>
              )}
              <p className="mt-1.5 text-[13px]">{edit.after}</p>
              <button
                type="button"
                className="mt-2 cursor-pointer text-[11px] text-muted-foreground underline"
                onClick={() => setPending((list) => list.filter((_, i) => i !== index))}
              >
                Skip this one
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="signal"
              disabled={apply.isPending || !canManage}
              onClick={() =>
                apply.mutate(pending, {
                  onSuccess: () => {
                    setPending([]);
                    setInstruction("");
                  },
                })
              }
            >
              {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Apply {pending.length} change{pending.length === 1 ? "" : "s"}
            </Button>
            {onPublishNow && publishState === "published" ? (
              <Button
                variant="outline"
                disabled={apply.isPending || isPublishing || !canManage}
                onClick={() =>
                  apply.mutate(pending, {
                    onSuccess: () => {
                      setPending([]);
                      setInstruction("");
                      onPublishNow();
                    },
                  })
                }
              >
                {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                Apply and push live
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setPending([])}>
              <X className="size-4" /> Discard
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
