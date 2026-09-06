/**
 * The builder's front door: one premium request box plus the quick actions
 * owners reach for most. Every button hands a plain-language instruction to the
 * existing assistant (plan → approve → apply → verify) through the assistant
 * bridge, so there is no second AI pipeline here.
 */
import { useState } from "react";
import { ChevronDown, Mic, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/assistant-bridge";
import { BUILDER_QUICK_ACTIONS } from "@/lib/builder-modes";
import { cn } from "@/lib/utils";

export function AiRequestPanel({
  canManage,
  onOpenAi,
  compact = false,
}: {
  canManage: boolean;
  /** Switch to the AI workspace, where uploads, voice and history live. */
  onOpenAi: () => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [howOpen, setHowOpen] = useState(false);

  const send = (instruction: string) => {
    if (!instruction.trim()) return;
    onOpenAi();
    askAssistant(instruction.trim());
  };

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="text-[15px] font-medium">Tell Revora what you want.</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Describe the result in your own words. Revora plans the changes, builds them, checks the
        result, and lets you review before publishing.
      </p>

      <Textarea
        className="mt-3 min-h-24 text-[13px]"
        placeholder="Describe what you want to change…"
        aria-label="Describe what you want to change"
        value={value}
        disabled={!canManage}
        onChange={(event) => setValue(event.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="signal"
          disabled={!canManage || !value.trim()}
          onClick={() => send(value)}
        >
          <Wand2 className="mr-1.5 size-4" aria-hidden /> Ask Revora
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenAi} disabled={!canManage}>
          <ImageIcon className="mr-1.5 size-4" aria-hidden /> Add photo or video
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenAi} disabled={!canManage}>
          <Mic className="mr-1.5 size-4" aria-hidden /> Speak
        </Button>
      </div>

      {compact ? null : (
        <div className="mt-4">
          <p className="eyebrow">Popular requests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BUILDER_QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={!canManage}
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

      <button
        type="button"
        aria-expanded={howOpen}
        onClick={() => setHowOpen((open) => !open)}
        className="mt-4 flex cursor-pointer items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        How it works
        <ChevronDown className={cn("size-3.5 transition-transform", howOpen && "rotate-180")} />
      </button>
      {howOpen ? (
        <ol className="mt-2 space-y-1 text-[12px] text-muted-foreground">
          <li>1. Revora reads your request and your real business details.</li>
          <li>2. It shows a plan of the exact changes before anything is applied.</li>
          <li>3. It builds the changes on your draft, never on your live site.</li>
          <li>4. It checks the result in a real browser and repairs what it finds.</li>
          <li>5. You review, undo or publish when you are happy.</li>
        </ol>
      ) : null}
    </section>
  );
}
