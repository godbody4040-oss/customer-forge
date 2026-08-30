import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaLibrary } from "@/components/app/MediaLibrary";

import { useAutosaveOrganization, useAutosaveProfile } from "@/lib/website-content.hooks";
import { WIZARD_STEPS, type WizardStepKey } from "@/lib/website-content";
import { WEBSITE_GOALS, type GoalKey } from "@/lib/website-plan";
import { cn } from "@/lib/utils";
import { focusAndScrollToId, useStepScroll } from "@/lib/use-step-scroll";

type ProfileRow = Record<string, unknown> | null | undefined;

type Props = {
  organizationId: string | undefined;
  org: { id?: string; name?: string | null; industry?: string | null } | null | undefined;
  profile: ProfileRow;
  servicesCount: number;
  pricedCount: number;
  canManage: boolean;
  structureSlot: ReactNode;
  launchSlot: ReactNode;
  /** Set by the page to send the owner straight to a step (and an anchor inside it). */
  jumpTo?: { step: WizardStepKey; anchor?: string; nonce: number } | null;
};

const text = (profile: ProfileRow, key: string) => {
  const value = profile?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
};

/**
 * Eight-step guided builder. Every field autosaves as it's edited, so moving
 * between steps — or leaving the page — never loses an answer.
 */
export function BuilderWizard({
  organizationId,
  org,
  profile,
  servicesCount,
  pricedCount,
  canManage,
  structureSlot,
  launchSlot,
  jumpTo = null,
}: Props) {
  const [step, setStep] = useState<WizardStepKey>("business");
  const stepRef = useStepScroll<HTMLElement>(step);
  const saveProfile = useAutosaveProfile(organizationId);
  const saveOrg = useAutosaveOrganization(organizationId);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const busy = saveProfile.isPending || saveOrg.isPending;

  useEffect(() => {
    if (!busy && (saveProfile.isSuccess || saveOrg.isSuccess)) setSavedAt(Date.now());
  }, [busy, saveProfile.isSuccess, saveOrg.isSuccess]);

  // The page can send the owner directly to the step (and the question) that is
  // blocking their build, instead of leaving them to hunt for it.
  useEffect(() => {
    if (!jumpTo) return;
    setStep(jumpTo.step);
    if (!jumpTo.anchor) return;
    const timer = setTimeout(() => focusAndScrollToId(jumpTo.anchor!), 120);
    return () => clearTimeout(timer);
  }, [jumpTo]);

  const goals = Array.isArray(profile?.["website_goals"]) ? (profile?.["website_goals"] as string[]) : [];

  const done: Record<WizardStepKey, boolean> = {
    business: !!org?.name && !!text(profile, "description"),
    services: servicesCount > 0,
    brand: !!text(profile, "primary_color") || !!text(profile, "hero_image_url"),
    contact: !!(text(profile, "phone") || text(profile, "email")),
    proof: !!(text(profile, "years_in_business") || text(profile, "certifications") || text(profile, "review_link")),
    goals: goals.length > 0,
    structure: true,
    launch: true,
  };

  const completion = Math.round(
    (Object.values(done).filter(Boolean).length / Object.keys(done).length) * 100,
  );

  const index = WIZARD_STEPS.findIndex((s) => s.key === step);
  const current = WIZARD_STEPS[index]!;
  const previous = index > 0 ? WIZARD_STEPS[index - 1] : null;
  const next = index < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[index + 1] : null;

  const field = (key: string, value: string) => saveProfile.mutate({ [key]: value || null });

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            Step {index + 1} of {WIZARD_STEPS.length}
          </p>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
            {busy ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Saving…
              </>
            ) : savedAt ? (
              <>
                <Check className="size-3 text-primary" /> All changes saved
              </>
            ) : (
              "Changes save automatically"
            )}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated" role="presentation">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="tnum text-[11px] text-muted-foreground">{completion}% ready</span>
        </div>
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {WIZARD_STEPS.map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setStep(item.key)}
                aria-current={item.key === step ? "step" : undefined}
                className={cn(
                  "cursor-pointer rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
                  item.key === step
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-elevated",
                )}
              >
                <span className="tnum mr-1.5 opacity-60">{i + 1}</span>
                {item.title}
                {done[item.key] && item.key !== step ? (
                  <Check className="ml-1.5 inline size-3 text-primary" aria-label="complete" />
                ) : null}
              </button>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel ref={stepRef} className="p-5">
        <SectionHeading
          eyebrow={current.help}
          title={current.title}
          action={done[step] ? <Pill tone="signal">Complete</Pill> : <Pill tone="neutral">In progress</Pill>}
        />

        <div className="mt-5 space-y-4">
          {step === "business" ? (
            <>
              
              <AutoField
                label="Business name"
                value={org?.name ?? ""}
                disabled={!canManage}
                onCommit={(value) => saveOrg.mutate({ name: value })}
              />
              <AutoField
                label="What you do (trade or category)"
                placeholder="Mobile car detailing"
                value={org?.industry ?? ""}
                disabled={!canManage}
                onCommit={(value) => saveOrg.mutate({ industry: value || null })}
              />
              <AutoField
                label="Tagline"
                value={text(profile, "tagline")}
                disabled={!canManage}
                onCommit={(value) => field("tagline", value)}
              />
              <AutoField
                label="Describe your business in your own words"
                help="Revora writes your website from this — it never invents claims."
                multiline
                value={text(profile, "description")}
                disabled={!canManage}
                onCommit={(value) => field("description", value)}
              />
            </>
          ) : null}

          {step === "services" ? (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                You have {servicesCount} service{servicesCount === 1 ? "" : "s"} listed
                {servicesCount ? `, ${pricedCount} with a price` : ""}. Services become cards on your website and
                options in your quote calculator.
              </p>
              <Button asChild variant="outline">
                <a href="/app/services">Manage my services</a>
              </Button>
            </div>
          ) : null}

          {step === "brand" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <AutoField
                  label="Main colour"
                  placeholder="#C8A24B"
                  value={text(profile, "primary_color")}
                  disabled={!canManage}
                  onCommit={(value) => field("primary_color", value)}
                />
                <AutoField
                  label="Second colour"
                  value={text(profile, "secondary_color")}
                  disabled={!canManage}
                  onCommit={(value) => field("secondary_color", value)}
                />
                <AutoField
                  label="Style"
                  placeholder="Clean and modern"
                  value={text(profile, "font_preference")}
                  disabled={!canManage}
                  onCommit={(value) => field("font_preference", value)}
                />
              </div>
              <MediaLibrary
                organizationId={organizationId}
                canManage={canManage}
                heroUrl={text(profile, "hero_image_url") || null}
                onSetHero={(value) => saveProfile.mutate({ hero_image_url: value })}
              />
            </>
          ) : null}

          {step === "contact" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <AutoField
                  label="Phone"
                  value={text(profile, "phone")}
                  disabled={!canManage}
                  onCommit={(value) => field("phone", value)}
                />
                <AutoField
                  label="Email"
                  value={text(profile, "email")}
                  disabled={!canManage}
                  onCommit={(value) => field("email", value)}
                />
                <AutoField
                  label="City"
                  value={text(profile, "city")}
                  disabled={!canManage}
                  onCommit={(value) => field("city", value)}
                />
                <AutoField
                  label="State / region"
                  value={text(profile, "state")}
                  disabled={!canManage}
                  onCommit={(value) => field("state", value)}
                />
                <AutoField
                  label="Areas you serve"
                  help="Used for local search."
                  value={text(profile, "service_area")}
                  disabled={!canManage}
                  onCommit={(value) => field("service_area", value)}
                />
                <AutoField
                  label="Address (optional)"
                  value={text(profile, "address")}
                  disabled={!canManage}
                  onCommit={(value) => field("address", value)}
                />
              </div>
            </>
          ) : null}

          {step === "proof" ? (
            <>
              <p className="text-[13px] text-muted-foreground">
                Only enter things that are true — Revora will never claim awards, licences or ratings you
                haven&apos;t supplied.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <AutoField
                  label="Years in business"
                  value={text(profile, "years_in_business")}
                  disabled={!canManage}
                  onCommit={(value) =>
                    saveProfile.mutate({ years_in_business: value ? Number(value) || null : null })
                  }
                />
                <AutoField
                  label="Review link (Google, Facebook)"
                  value={text(profile, "review_link")}
                  disabled={!canManage}
                  onCommit={(value) => field("review_link", value)}
                />
              </div>
              <AutoField
                label="Certifications or licences"
                multiline
                value={text(profile, "certifications")}
                disabled={!canManage}
                onCommit={(value) => field("certifications", value)}
              />
              <AutoField
                label="Awards or recognition"
                multiline
                value={text(profile, "awards")}
                disabled={!canManage}
                onCommit={(value) => field("awards", value)}
              />
            </>
          ) : null}

          {step === "goals" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {WEBSITE_GOALS.map((goal) => {
                const active = goals.includes(goal.value);
                return (
                  <button
                    key={goal.value}
                    type="button"
                    disabled={!canManage}
                    onClick={() => {
                      const nextGoals = active
                        ? goals.filter((g) => g !== goal.value)
                        : [...goals, goal.value as GoalKey];
                      saveProfile.mutate({ website_goals: nextGoals });
                    }}
                    className={cn(
                      "cursor-pointer rounded-md border p-3.5 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-elevated",
                    )}
                  >
                    <p className="text-[14px] font-medium">{goal.label}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">Main button: {goal.cta}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === "structure" ? structureSlot : null}
          {step === "launch" ? launchSlot : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" disabled={!previous} onClick={() => previous && setStep(previous.key)}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {next ? (
            <Button variant="signal" onClick={() => setStep(next.key)}>
              Save &amp; continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <span className="text-[12px] text-muted-foreground">Last step</span>
          )}
        </div>
      </Panel>
    </div>
  );
}

/** Debounced autosaving input — the value is written ~800ms after typing stops. */
function AutoField({
  label,
  help,
  value,
  placeholder,
  multiline,
  disabled,
  onCommit,
}: {
  label: string;
  help?: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const schedule = (nextValue: string) => {
    setDraft(nextValue);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (nextValue.trim() !== value.trim()) onCommit(nextValue.trim());
    }, 800);
  };

  const commitNow = () => {
    if (timer.current) clearTimeout(timer.current);
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          rows={4}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => schedule(event.target.value)}
          onBlur={commitNow}
        />
      ) : (
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => schedule(event.target.value)}
          onBlur={commitNow}
        />
      )}
      {help ? <p className="text-[12px] text-muted-foreground">{help}</p> : null}
    </div>
  );
}
