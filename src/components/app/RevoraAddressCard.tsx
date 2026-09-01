/**
 * FREE REVORA ADDRESS panel.
 *
 * Included with every website: `yourname.revoragrowthsystems.com`, secured with
 * HTTPS, live the moment the site is published. It is deliberately presented
 * apart from a CUSTOM DOMAIN so an owner always knows which address is which,
 * and that they never need to buy a domain to launch.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { friendlyError } from "@/lib/user-error";
import { Check, Copy, ExternalLink, Gift, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkRevoraAddressLive, claimRevoraAddress } from "@/lib/revora-address.functions";
import {
  SITE_ROOT,
  customDomainIsLive,
  normalizeSubdomain,
  revoraHost,
  validateSubdomain,
} from "@/lib/revora-address";

export function RevoraAddressCard({
  organizationId,
  settings,
  canManage,
}: {
  organizationId: string | undefined;
  settings:
    | {
        subdomain?: string | null;
        custom_domain?: string | null;
        dns_ok?: boolean | null;
        ssl_ok?: boolean | null;
        publish_state?: string | null;
      }
    | null
    | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const claimFn = useServerFn(claimRevoraAddress);
  const current = settings?.subdomain ?? "";
  const [value, setValue] = useState(current);
  const [editing, setEditing] = useState(false);

  const host = revoraHost(current);
  const url = host ? `https://${host}` : null;
  const published = settings?.publish_state === "published";
  const customLive = customDomainIsLive(settings ?? {});
  const check = validateSubdomain(value);

  const claim = useMutation({
    mutationFn: () =>
      claimFn({ data: { organizationId: organizationId!, subdomain: normalizeSubdomain(value) } }),
    onSuccess: (result) => {
      toast.success(`Your free Revora address is now ${result.host}`);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["website_settings", organizationId] });
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  // The honest state of the free address: proven by a real DNS + HTTPS lookup.
  const liveFn = useServerFn(checkRevoraAddressLive);
  const verify = useMutation({
    mutationFn: () => liveFn({ data: { organizationId: organizationId! } }),
    onSuccess: (result) => {
      if (result.live) toast.success(result.detail);
      else toast.message("Not live yet", { description: result.detail });
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return (
    <Panel className="space-y-4 p-5">
      <SectionHeading
        eyebrow="Included free"
        title="Your free Revora address"
        action={
          <Pill tone={published ? "signal" : "neutral"}>
            {published ? "Live with HTTPS" : "Ready — live when you publish"}
          </Pill>
        }
      />
      <p className="text-[13px] text-muted-foreground">
        Every Revora website comes with its own free web address on our domain. You don&apos;t need
        to buy a domain to launch — and this address keeps working forever, even after you connect a
        domain of your own.
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
        <Gift className="size-4 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 break-all font-mono text-[13px]">
          {host ?? "Assigned when your website is created"}
        </span>
        {url ? (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void navigator.clipboard?.writeText(url).then(
                  () => toast.success("Address copied"),
                  () => toast.error("Copy failed — select the text instead."),
                )
              }
            >
              <Copy className="size-3.5" /> Copy
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Visit
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {host ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={verify.isPending || !organizationId}
            onClick={() => verify.mutate()}
          >
            {verify.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Check my address
          </Button>
          {verify.data ? (
            <Pill tone={verify.data.live ? "signal" : "warn"}>
              {verify.data.live ? "DNS + HTTPS verified" : "Not answering yet"}
            </Pill>
          ) : null}
          {verify.data ? (
            <span className="min-w-0 flex-1 text-[11.5px] text-muted-foreground">
              {verify.data.detail}
            </span>
          ) : null}
        </div>
      ) : null}



      <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-3">
        <p className="rounded-md border border-border/60 p-2.5">
          <ShieldCheck className="mb-1 size-3.5 text-primary" aria-hidden="true" />
          <br />
          HTTPS is included and renews itself.
        </p>
        <p className="rounded-md border border-border/60 p-2.5">
          Only you can use this address — it&apos;s reserved to your business.
        </p>
        <p className="rounded-md border border-border/60 p-2.5">
          {customLive
            ? "Your own domain is live, and this address still works."
            : "Visitors use this address until your own domain is verified."}
        </p>
      </div>

      {canManage ? (
        editing ? (
          <div className="space-y-2">
            <Label className="text-[12px]">Choose your address</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={value}
                onChange={(event) => setValue(normalizeSubdomain(event.target.value))}
                placeholder="your-business"
                className="max-w-56"
                aria-label="Free Revora address"
              />
              <span className="font-mono text-[12px] text-muted-foreground">.{SITE_ROOT}</span>
              <Button
                variant="signal"
                size="sm"
                disabled={!check.ok || claim.isPending || !organizationId}
                onClick={() => claim.mutate()}
              >
                {claim.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Save address
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValue(current);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {check.ok
                ? `Your site will be at ${check.value}.${SITE_ROOT}`
                : check.error}
            </p>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change my free address
          </Button>
        )
      ) : null}
    </Panel>
  );
}
