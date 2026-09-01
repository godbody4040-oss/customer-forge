import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkDomainAvailability, saveOwnDomain } from "@/lib/domain.functions";
import {
  DNS_HELP,
  DOMAIN_STEPS,
  REGISTRARS,
  dnsRows,
  domainSuggestions,
  looksLikeDomain,
  normalizeInput,
} from "@/lib/domain-setup";
import { DOMAIN_STATES } from "@/lib/readiness";
import { revoraSubdomain } from "@/lib/website-plan";
import { RevoraAddressCard } from "@/components/app/RevoraAddressCard";
import { revoraHost } from "@/lib/revora-address";
import { dateLong } from "@/lib/format";

type Availability = { domain: string; state: "available" | "taken" | "unknown" | "invalid" };

function copy(value: string, label: string) {
  void navigator.clipboard?.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Copy failed — select the text instead."),
  );
}

/**
 * Self-serve domain center. An owner can find and buy a name, or connect one
 * they already own, and see verified DNS/HTTPS status the whole way. Status is
 * only ever reported from a real check — nothing shows as live early.
 */
export function DomainCenter({
  organizationId,
  slug,
  businessName,
  city,
  industry,
  settings,
  canManage,
}: {
  organizationId: string | undefined;
  slug: string | undefined;
  businessName: string | null | undefined;
  city: string | null | undefined;
  industry: string | null | undefined;
  settings:
    | {
        custom_domain?: string | null;
        domain_status?: string | null;
        domain_error?: string | null;
        domain_checked_at?: string | null;
        dns_ok?: boolean | null;
        ssl_ok?: boolean | null;
        publish_state?: string | null;
        subdomain?: string | null;
      }
    | null
    | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveOwnDomain);
  const availabilityFn = useServerFn(checkDomainAvailability);

  const connected = settings?.custom_domain ?? "";
  const [input, setInput] = useState(connected);
  const [idea, setIdea] = useState("");
  const [results, setResults] = useState<Availability[]>([]);

  const status = settings?.domain_status ?? "not_connected";
  const dnsOk = !!settings?.dns_ok;
  const sslOk = !!settings?.ssl_ok;
  const published = settings?.publish_state === "published";

  const suggestions = useMemo(
    () => domainSuggestions({ businessName, city, industry, slug }).slice(0, 8),
    [businessName, city, industry, slug],
  );

  const save = useMutation({
    mutationFn: (value: string) =>
      saveFn({ data: { organizationId: organizationId!, domain: value } }),
    onSuccess: (result) => {
      toast.message(DOMAIN_STATES[result.status]?.label ?? result.status, {
        description: result.detail,
      });
      void queryClient.invalidateQueries({ queryKey: ["website_settings", organizationId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const availability = useMutation({
    mutationFn: (domains: string[]) => availabilityFn({ data: { domains } }),
    onSuccess: (data) => setResults(data.results as Availability[]),
    onError: (error: Error) => toast.error(error.message),
  });

  const stepDone: Record<string, boolean> = {
    choose: !!connected,
    connect: !!connected,
    dns: dnsOk,
    verify: dnsOk && sslOk,
    live: dnsOk && sslOk && published,
  };

  const rows = dnsRows(connected);
  const ideaTargets = () => {
    const typed = normalizeInput(idea);
    if (!typed) return suggestions;
    if (looksLikeDomain(typed)) return [typed];
    return domainSuggestions({ businessName: typed, city, industry }).slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* FREE REVORA ADDRESS — always included, never blocked on a purchase */}
      <RevoraAddressCard
        organizationId={organizationId}
        settings={settings}
        canManage={canManage}
      />

      {/* CUSTOM DOMAIN — optional, and only ever active once verified */}
      <Panel className="space-y-4 p-5">
        <SectionHeading
          eyebrow="Optional — your own domain"
          title={connected || "No custom domain connected"}
          action={
            <Pill tone={DOMAIN_STATES[status]?.tone ?? "neutral"}>
              {DOMAIN_STATES[status]?.label ?? status}
            </Pill>
          }
        />
        <p className="text-[13px] text-muted-foreground">{DOMAIN_STATES[status]?.help}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-[12px] font-medium">Free Revora address</p>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">
              {revoraHost(settings?.subdomain) ?? revoraSubdomain(slug ?? "")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Included with your website — you never have to buy a domain to go live. Once your own
              domain is verified, this address permanently redirects to it, so old links still work.
            </p>

          </div>
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-[12px] font-medium">Your own domain (optional)</p>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">
              {connected || "Not connected yet"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {connected && dnsOk && sslOk
                ? "Verified and live with HTTPS."
                : "It only goes live after DNS and HTTPS both pass — until then your free Revora address serves the site."}
            </p>
          </div>
        </div>
        <ol className="grid gap-2 sm:grid-cols-5">
          {DOMAIN_STEPS.map((step, index) => (
            <li key={step.id} className="rounded-md border border-border/60 p-3">
              <div className="flex items-center gap-1.5">
                {stepDone[step.id] ? (
                  <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="text-[11px] font-medium">
                  {index + 1}. {step.title}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
      </Panel>


      {/* Buy a new domain */}
      <Panel className="space-y-4 p-5">
        <SectionHeading eyebrow="Buy a domain" title="Find a name that's still available" />
        <p className="text-[13px] text-muted-foreground">
          We check the official registry directory for each name. When one is free, register it at
          any registrar below, then come back and connect it — it takes a couple of minutes.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
            <Label className="mb-1.5 block text-[12px]">Business name or domain idea</Label>
            <Input
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder={businessName ?? "e.g. elite mobile detailing"}
            />
          </div>
          <Button
            variant="signal"
            disabled={availability.isPending}
            onClick={() => availability.mutate(ideaTargets())}
          >
            {availability.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Check availability
          </Button>
        </div>

        {!results.length ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="cursor-pointer rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-elevated"
                onClick={() => setIdea(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.domain}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-mono text-[12px]">{result.domain}</span>
                  <Pill
                    tone={
                      result.state === "available"
                        ? "signal"
                        : result.state === "taken"
                          ? "neutral"
                          : "attention"
                    }
                  >
                    {result.state === "available"
                      ? "Looks available"
                      : result.state === "taken"
                        ? "Already registered"
                        : result.state === "invalid"
                          ? "Not a valid name"
                          : "Couldn't confirm"}
                  </Pill>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.state === "available" ? (
                    <>
                      {REGISTRARS.slice(0, 3).map((r) => (
                        <Button key={r.id} size="sm" variant="outline" asChild>
                          <a
                            href={r.search(result.domain)}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {r.name.split(" ")[0]} <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="signal"
                        disabled={!canManage || save.isPending}
                        onClick={() => {
                          setInput(result.domain);
                          save.mutate(result.domain);
                        }}
                      >
                        Use this
                      </Button>
                    </>
                  ) : result.state === "taken" ? (
                    <span className="text-[11px] text-muted-foreground">
                      Try a different word or ending
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Availability is a strong hint from the registry directory — the registrar's checkout
              is the final word on price and availability.
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {REGISTRARS.map((r) => (
            <div key={r.id} className="rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium">{r.name}</p>
                <Button size="sm" variant="ghost" asChild>
                  <a
                    href={r.search(normalizeInput(idea) || suggestions[0] || "")}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{r.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Connect a domain you own */}
      <Panel className="space-y-4 p-5">
        <SectionHeading eyebrow="Connect a domain" title="Use a domain you already own" />
        <p className="text-[13px] text-muted-foreground">
          Save it here first. We keep checking your DNS in the background and only report it live
          once the records resolve here and HTTPS is working.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
            <Label className="mb-1.5 block text-[12px]">Your domain</Label>
            <Input
              value={input}
              onChange={(event) => setInput(normalizeInput(event.target.value))}
              placeholder="yourbusiness.com"
              disabled={!canManage}
            />
          </div>
          <Button
            variant="signal"
            disabled={!canManage || save.isPending || (!!input && !looksLikeDomain(input))}
            onClick={() => save.mutate(input)}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Save & check
          </Button>
          {connected ? (
            <Button
              variant="outline"
              disabled={!canManage || save.isPending}
              onClick={() => save.mutate(connected)}
            >
              <RefreshCw className="size-4" /> Re-check now
            </Button>
          ) : null}
          {connected ? (
            <Button
              variant="ghost"
              disabled={!canManage || save.isPending}
              onClick={() => {
                setInput("");
                save.mutate("");
              }}
            >
              Remove domain
            </Button>
          ) : null}
        </div>
        {input && !looksLikeDomain(input) ? (
          <p className="text-[12px] text-destructive">
            Enter a bare domain like <span className="font-mono">yourbusiness.com</span> — no
            https:// and no trailing slash.
          </p>
        ) : null}
      </Panel>

      {/* DNS records + verified status */}
      {connected ? (
        <Panel className="space-y-4 p-5">
          <SectionHeading
            eyebrow="Step 3"
            title="Add these two records at your registrar"
            action={
              <Pill tone={dnsOk ? "signal" : "attention"}>
                {dnsOk ? "DNS resolving here" : "Waiting on DNS"}
              </Pill>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3">Type</th>
                  <th className="py-1.5 pr-3">Name / host</th>
                  <th className="py-1.5 pr-3">Value</th>
                  <th className="py-1.5 pr-3">TTL</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.name}`} className="border-t border-border/60">
                    <td className="py-2 pr-3 font-mono">{row.type}</td>
                    <td className="py-2 pr-3 font-mono">{row.name}</td>
                    <td className="py-2 pr-3 font-mono">{row.value}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.ttl}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(row.value, "Record value")}
                      >
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {DNS_HELP.map((help) => (
              <li key={help.registrar} className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{help.registrar}:</span> {help.where}
              </li>
            ))}
          </ul>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium">DNS check</p>
                <Pill tone={dnsOk ? "signal" : "attention"}>
                  {dnsOk ? "Resolving here" : "Not pointing here"}
                </Pill>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Changes usually appear within an hour, but registrars can take up to 48 hours.
              </p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium">Secure certificate (HTTPS)</p>
                <Pill tone={sslOk ? "signal" : dnsOk ? "info" : "neutral"}>
                  {sslOk ? "HTTPS active" : dnsOk ? "Being issued" : "Waiting on DNS"}
                </Pill>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Issued automatically once DNS resolves here. No configuration needed from you.
              </p>
            </div>
          </div>

          {settings?.domain_error ? (
            <p className="text-[12px] text-destructive">{settings.domain_error}</p>
          ) : null}
          {!published && dnsOk && sslOk ? (
            <p className="text-[12px] text-accent">
              Your domain is ready. Publish your website and it will serve at {connected}.
            </p>
          ) : null}
          {settings?.domain_checked_at ? (
            <p className="text-[11px] text-muted-foreground">
              Last checked {dateLong(settings.domain_checked_at)}
            </p>
          ) : null}
          {connected && dnsOk && sslOk && published ? (
            <Button variant="outline" asChild>
              <a href={`https://${connected}`} target="_blank" rel="noreferrer noopener">
                Visit {connected} <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
