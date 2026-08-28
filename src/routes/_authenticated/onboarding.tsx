import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote } from "@/components/app/Bits";
import { CONVERSION_GOALS, INDUSTRIES } from "@/lib/domain";
import { slugify } from "@/lib/format";
import { useWorkspace } from "@/lib/use-tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — Local Lead Engine" },
      { name: "description", content: "Three steps to a live, conversion-first business website." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

type Draft = {
  businessName: string;
  industry: string;
  city: string;
  phone: string;
  goal: string;
  about: string;
  serviceName: string;
  servicePrice: string;
};

const STEPS = ["Business", "Goal", "First service"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const { data: ws } = useWorkspace();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    businessName: "",
    industry: INDUSTRIES[0]!.name,
    city: "",
    phone: "",
    goal: "quotes",
    about: "",
    serviceName: "",
    servicePrice: "",
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const template =
    INDUSTRIES.find((i) => i.name === draft.industry)?.template ?? "default";

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Your session expired. Please sign in again.");

      const base = slugify(draft.businessName) || "my-business";
      let slug = base;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${base}-${Math.floor(Math.random() * 900 + 100)}`;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: draft.businessName.trim(),
          slug,
          industry: draft.industry,
          conversion_goal: draft.goal as never,
          template,
          owner_id: user.id,
          onboarding_completed: true,
          onboarding_step: 3,
        })
        .select("id, slug")
        .single();
      if (orgError) throw orgError;

      await supabase
        .from("memberships")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

      await supabase.from("business_profiles").insert({
        organization_id: org.id,
        phone: draft.phone || null,
        city: draft.city || null,
        about: draft.about || null,
        tagline: `${draft.industry} in ${draft.city || "your area"}`,
        service_area: draft.city || null,
      });

      await supabase.from("website_settings").insert({
        organization_id: org.id,
        template,
        headline: `${draft.industry} you can actually book`,
        subheadline: draft.about || `Serving ${draft.city || "your area"}. Fast quotes, real availability.`,
      });

      if (draft.serviceName.trim()) {
        await supabase.from("services").insert({
          organization_id: org.id,
          name: draft.serviceName.trim(),
          price: draft.servicePrice ? Number(draft.servicePrice) : null,
          starting_price: true,
          bookable: true,
          featured: true,
          sort_order: 0,
        });
      }

      toast.success("Your business is live.");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (ws?.workspace) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-[20px] font-semibold">You're already set up</h1>
        <Button variant="signal" className="mt-6" onClick={() => navigate({ to: "/app" })}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  const canContinue =
    step === 0
      ? draft.businessName.trim().length > 1 && draft.city.trim().length > 1
      : step === 1
        ? !!draft.goal
        : true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <ol className="flex items-center gap-2" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "tnum grid size-6 place-items-center rounded-full text-[11px] font-semibold",
                  index <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-elevated text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-[12px]",
                  index === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>

        <div className="panel mt-8 p-6">
          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-[20px] font-semibold">Tell us about the business</h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  This becomes your website address and headline. You can change all of it later.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-name">Business name</Label>
                <Input
                  id="o-name"
                  value={draft.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="Elite Mobile Detailing"
                />
                {draft.businessName ? (
                  <p className="text-[11px] text-muted-foreground">
                    Your site: /s/{slugify(draft.businessName) || "my-business"}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="o-industry">Industry</Label>
                  <select
                    id="o-industry"
                    value={draft.industry}
                    onChange={(e) => set("industry", e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {INDUSTRIES.map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-city">City you serve</Label>
                  <Input
                    id="o-city"
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Austin, TX"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-phone">Phone number</Label>
                <Input
                  id="o-phone"
                  value={draft.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(555) 019-4420"
                  inputMode="tel"
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-[20px] font-semibold">
                  What counts as a win for you?
                </h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Your whole site points at this one action.
                </p>
              </div>
              <div className="grid gap-2">
                {CONVERSION_GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => set("goal", goal.value)}
                    className={cn(
                      "cursor-pointer rounded-md border p-4 text-left transition-colors",
                      draft.goal === goal.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-elevated",
                    )}
                  >
                    <p className="text-[14px] font-medium">{goal.label}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{goal.description}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-about">One line about the business</Label>
                <Textarea
                  id="o-about"
                  rows={3}
                  value={draft.about}
                  onChange={(e) => set("about", e.target.value)}
                  placeholder="We come to you. Showroom-quality detailing, seven days a week."
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-[20px] font-semibold">Add your first service</h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  One is enough to go live. Add the rest whenever you like.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="o-service">Service name</Label>
                  <Input
                    id="o-service"
                    value={draft.serviceName}
                    onChange={(e) => set("serviceName", e.target.value)}
                    placeholder="Full interior + exterior detail"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-price">Starting at ($)</Label>
                  <Input
                    id="o-price"
                    value={draft.servicePrice}
                    onChange={(e) => set("servicePrice", e.target.value.replace(/[^0-9.]/g, ""))}
                    inputMode="decimal"
                    placeholder="189"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="mt-5">{<ErrorNote message={error} />}</div> : null}

          <div className="mt-7 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || busy}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="signal"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue || busy}
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="signal" onClick={finish} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Launch my business
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
