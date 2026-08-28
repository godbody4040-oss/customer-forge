import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { EmptyState, LoadingRows, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateLead, useLeads, useUpdateLead } from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { LEAD_STATUSES, leadStatusMeta, sourceLabel, type LeadStatus } from "@/lib/domain";
import { currency, relative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Local Lead Engine" },
      { name: "description", content: "Every lead from new to booked in one pipeline." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { data: ws } = useWorkspace();
  const orgId = ws?.workspace?.organizationId;
  const { data: leads, isLoading } = useLeads(orgId);
  const updateLead = useUpdateLead(orgId);
  const createLead = useCreateLead(orgId);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesQuery =
        !q ||
        [lead.name, lead.email, lead.phone, lead.service_interest, lead.city]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  const selected = (leads ?? []).find((l) => l.id === selectedId) ?? null;

  if (isLoading) return <LoadingRows rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Leads</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="signal">
              <Plus className="size-4" /> Add lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a lead</DialogTitle>
              <DialogDescription>
                For the calls and walk-ups that didn't come through your website.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                createLead.mutate(
                  {
                    name: String(form.get("name") ?? ""),
                    email: String(form.get("email") ?? "") || undefined,
                    phone: String(form.get("phone") ?? "") || undefined,
                    service_interest: String(form.get("service") ?? "") || undefined,
                    estimated_value: Number(form.get("value") ?? 0) || 0,
                    message: String(form.get("message") ?? "") || undefined,
                    source: "manual",
                  },
                  { onSuccess: () => setAddOpen(false) },
                );
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="l-name">Name</Label>
                <Input id="l-name" name="name" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="l-phone">Phone</Label>
                  <Input id="l-phone" name="phone" inputMode="tel" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-email">Email</Label>
                  <Input id="l-email" name="email" type="email" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="l-service">Interested in</Label>
                  <Input id="l-service" name="service" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-value">Job value ($)</Label>
                  <Input id="l-value" name="value" inputMode="decimal" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-message">Notes</Label>
                <Textarea id="l-message" name="message" rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="signal" disabled={createLead.isPending}>
                  Add lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, service…"
            className="pl-9"
            aria-label="Search leads"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${statusFilter === "all" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            All
          </button>
          {LEAD_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${statusFilter === s.value ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-3">
          {LEAD_STATUSES.map((status) => {
            const column = filtered.filter((l) => l.status === status.value);
            return (
              <section key={status.value} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">{status.label}</span>
                  <span className="tnum rounded-full bg-elevated px-1.5 py-0.5 text-[10px] font-semibold">
                    {column.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {column.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedId(lead.id)}
                      className="panel w-full cursor-pointer p-3 text-left transition-colors hover:border-muted-foreground/40"
                    >
                      <p className="truncate text-[13px] font-medium">{lead.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {[lead.service_interest, sourceLabel(lead.source)].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="tnum text-[11px] text-muted-foreground">
                          {currency(Number(lead.estimated_value ?? 0))}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {relative(lead.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {column.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Nothing here
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {(leads ?? []).length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Leads from your website, quote calculator and booking form all land here automatically."
        />
      ) : null}

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {[sourceLabel(selected.source), selected.city, relative(selected.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selected.phone ? (
                    <Button asChild variant="signal" size="sm">
                      <a href={`tel:${selected.phone}`}>
                        <Phone className="size-4" /> Call {selected.phone}
                      </a>
                    </Button>
                  ) : null}
                  {selected.email ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${selected.email}`}>
                        <Mail className="size-4" /> Email
                      </a>
                    </Button>
                  ) : null}
                </div>

                {selected.message ? (
                  <Panel className="p-3.5">
                    <p className="eyebrow">What they said</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed">{selected.message}</p>
                  </Panel>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-status">Status</Label>
                    <select
                      id="d-status"
                      value={selected.status}
                      onChange={(e) =>
                        updateLead.mutate({
                          id: selected.id,
                          patch: { status: e.target.value as LeadStatus },
                        })
                      }
                      className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-value">Job value ($)</Label>
                    <Input
                      id="d-value"
                      defaultValue={String(selected.estimated_value ?? "")}
                      inputMode="decimal"
                      onBlur={(e) =>
                        updateLead.mutate({
                          id: selected.id,
                          patch: { estimated_value: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={leadStatusMeta(selected.status).tone}>
                    {leadStatusMeta(selected.status).label}
                  </Pill>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateLead.mutate({
                        id: selected.id,
                        patch: { last_contacted_at: new Date().toISOString() },
                      })
                    }
                  >
                    Mark contacted
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateLead.mutate({
                        id: selected.id,
                        patch: {
                          next_follow_up_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
                        },
                      })
                    }
                  >
                    Follow up in 2 days
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Panel className="p-5">
        <SectionHeading eyebrow="Reference" title="How the pipeline works" />
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          New leads arrive on the left. Move them right as you contact, quote and book. Anything sat
          in New with no reply is money leaking — the dashboard surfaces those first.
        </p>
      </Panel>
    </div>
  );
}
