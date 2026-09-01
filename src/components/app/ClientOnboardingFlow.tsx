/**
 * Client onboarding flow inside the builder.
 *
 * Four plain steps a client can finish end to end: choose the plan (setup +
 * monthly), build the site, publish it, then share their portal link. Each step
 * shows its real state from the workspace record — nothing is a checkbox the
 * client ticks themselves.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalAccess } from "@/components/app/PortalAccess";
import { GROWTH_SYSTEM, usdExact } from "@/lib/offer";
import { getPublicOfferRates } from "@/lib/offer.functions";
import { cn } from "@/lib/utils";

type Props = {
  organizationId: string | undefined;
  canManage: boolean;
  /** "paid" once the one-time setup fee has cleared. */
  setupPaid: boolean;
  publishState: string;
  buildReady: boolean;
  requiredAnswers: number;
  isPublishing: boolean;
  onPublish: () => void;
  onGoTo: (section: string) => void;
};

export function ClientOnboardingFlow({
  organizationId,
  canManage,
  setupPaid,
  publishState,
  buildReady,
  requiredAnswers,
  isPublishing,
  onPublish,
  onGoTo,
}: Props) {
  const ratesFn = useServerFn(getPublicOfferRates);
  const rates = useQuery({
    queryKey: ["public-offer-rates"],
    queryFn: () => ratesFn({}),
    staleTime: 5 * 60 * 1000,
  });
  const setupPrice = rates.data?.setupPrice ?? GROWTH_SYSTEM.setupPrice;
  const monthlyPrice = rates.data?.monthlyPrice ?? GROWTH_SYSTEM.monthlyPrice;

  const published = publishState === "published";
  const steps = [
    { key: "plan", title: "Choose your plan", done: setupPaid },
    { key: "build", title: "Build your website", done: buildReady },
    { key: "publish", title: "Publish it", done: published },
    { key: "portal", title: "Share your portal link", done: published && setupPaid },
  ];
  const current = steps.find((step) => !step.done)?.key ?? "portal";
  const [open, setOpen] = React.useState<string>(current);

  React.useEffect(() => setOpen(current), [current]);

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Getting started</p>
          <h2 className="mt-1 font-display text-[16px] font-semibold">
            Four steps to a live growth system
          </h2>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {steps.filter((s) => s.done).length} of {steps.length} done
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const isOpen = open === step.key;
          return (
            <li
              key={step.key}
              className={cn(
                "rounded-lg border transition-colors",
                isOpen ? "border-primary/50 bg-primary/[0.03]" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? "" : step.key)}
                className="flex w-full items-center gap-3 p-3 text-left"
                aria-expanded={isOpen}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[11px]",
                    step.done
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="size-3.5" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium">{step.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {step.done ? "Done" : isOpen ? "Open" : "Next"}
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-border/70 p-3">
                  {step.key === "plan" ? (
                    <div>
                      <p className="text-[13px]">
                        <span className="gold-text font-display text-[20px] font-semibold">
                          {usdExact(setupPrice)}
                        </span>{" "}
                        one-time setup, then{" "}
                        <span className="gold-text font-medium">
                          {usdExact(monthlyPrice)}/month
                        </span>{" "}
                        — your first month is free.
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {setupPaid
                          ? "Your setup fee has cleared — production publishing and your custom domain are unlocked."
                          : "You can build and test everything during your free access. Paying the setup fee unlocks going live on your own domain."}
                      </p>
                      <Button asChild size="sm" variant="signal" className="mt-3">
                        <Link to="/app/billing">
                          {setupPaid ? "View billing" : "Pay setup & activate"}
                        </Link>
                      </Button>
                    </div>
                  ) : null}

                  {step.key === "build" ? (
                    <div>
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        {requiredAnswers > 0
                          ? `Answer the ${requiredAnswers} remaining business question${requiredAnswers === 1 ? "" : "s"} — Revora writes your pages from them. Then edit anything visually on the canvas.`
                          : "Your answers are in. Edit any headline, paragraph or card directly on the visual canvas."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="signal" onClick={() => onGoTo("answers")}>
                          {requiredAnswers > 0 ? "Answer questions" : "Review answers"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onGoTo("canvas")}>
                          Open visual canvas
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {step.key === "publish" ? (
                    <div>
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        {published
                          ? "Your site is live. Publish again any time you make changes."
                          : "Run the launch checks, then publish. Your site goes live on your Revora address, and on your own domain once it's connected."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="signal"
                          disabled={!canManage || isPublishing}
                          onClick={onPublish}
                        >
                          {isPublishing
                            ? "Publishing…"
                            : published
                              ? "Publish updates"
                              : "Publish site"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onGoTo("launch")}>
                          Launch checks
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {step.key === "portal" ? (
                    <PortalAccess organizationId={organizationId} canManage={canManage} />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
