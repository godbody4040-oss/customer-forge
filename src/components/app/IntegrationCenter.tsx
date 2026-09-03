import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, HelpCircle, Plug, XCircle } from "lucide-react";
import { Panel, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  buildIntegrationCards,
  integrationStatusLabel,
  integrationSummary,
  type IntegrationStatus,
} from "@/lib/integrations";
import { useIntegrationFacts } from "@/lib/integrations.hooks";

const icons: Record<IntegrationStatus, typeof CheckCircle2> = {
  connected: CheckCircle2,
  action_needed: AlertTriangle,
  not_connected: XCircle,
  unknown: HelpCircle,
};

const tones: Record<IntegrationStatus, string> = {
  connected: "text-emerald-400",
  action_needed: "text-amber-400",
  not_connected: "text-muted-foreground",
  unknown: "text-muted-foreground",
};

/**
 * Integration Center — one honest list of what's connected for this workspace
 * and what still needs a step. Every line comes from real database facts.
 */
export function IntegrationCenter({ organizationId }: { organizationId: string | undefined }) {
  const { data: facts, isLoading, isError, refetch } = useIntegrationFacts(organizationId);
  const cards = facts ? buildIntegrationCards(facts) : [];
  const summary = integrationSummary(cards);

  return (
    <Panel className="p-5">
      <SectionHeading
        eyebrow="Revora"
        title="Integration Center"
        description="Payments, alerts, domain, search, automations and AI — with their real status."
      />

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Checking your connections…</p>
      ) : isError ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your connections couldn't be checked just now.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.connected} of {summary.total} connected
            {summary.needsAction > 0 ? ` · ${summary.needsAction} need attention` : ""}
            {summary.notConnected > 0 ? ` · ${summary.notConnected} not set up` : ""}
            {summary.unknown > 0 ? ` · ${summary.unknown} couldn't be checked` : ""}
          </p>

          <ul className="mt-4 space-y-3">
            {cards.map((card) => {
              const Icon = icons[card.status];
              return (
                <li
                  key={card.key}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tones[card.status]}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {integrationStatusLabel(card.status)} — {card.detail}
                      </p>
                    </div>
                  </div>
                  {card.action ? (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={card.action.to}>{card.action.label}</Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
