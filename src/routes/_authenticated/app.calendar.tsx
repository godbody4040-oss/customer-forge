import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, LoadingRows, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { useAppointments, useServices, useUpdateAppointment } from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { appointmentStatusMeta, type AppointmentStatus } from "@/lib/domain";
import { dateLong, timeShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Local Lead Engine" },
      { name: "description", content: "Confirm, reschedule and track every booking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function CalendarPage() {
  const { data: ws } = useWorkspace();
  const orgId = ws?.workspace?.organizationId;
  const { data: appointments, isLoading } = useAppointments(orgId);
  const { data: services } = useServices(orgId);
  const updateAppointment = useUpdateAppointment(orgId);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        return date;
      }),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    for (const appt of appointments ?? []) {
      const key = new Date(appt.starts_at).toDateString();
      map.set(key, [...(map.get(key) ?? []), appt]);
    }
    return map;
  }, [appointments]);

  const pending = (appointments ?? []).filter((a) => a.status === "pending");
  const serviceName = (id: string | null) =>
    (services ?? []).find((s) => s.id === id)?.name ?? null;

  if (isLoading) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() - 7);
              setWeekStart(next);
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              setWeekStart(next);
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {pending.length ? (
        <Panel className="border-accent/30 p-5">
          <SectionHeading
            eyebrow="Needs your answer"
            title={`${pending.length} booking request${pending.length > 1 ? "s" : ""}`}
          />
          <ul className="mt-4 divide-y divide-border">
            {pending.map((appt) => (
              <li key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{appt.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dateLong(appt.starts_at)} · {timeShort(appt.starts_at)}
                    {serviceName(appt.service_id) ? ` · ${serviceName(appt.service_id)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="signal"
                    size="sm"
                    onClick={() => updateAppointment.mutate({ id: appt.id, status: "confirmed" })}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateAppointment.mutate({ id: appt.id, status: "cancelled" })}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="grid w-max min-w-full grid-cols-7 gap-2">
          {days.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const items = byDay.get(day.toDateString()) ?? [];
            return (
              <section
                key={day.toISOString()}
                className={cn(
                  "w-40 rounded-lg border p-2.5",
                  isToday ? "border-primary/40 bg-card" : "border-border bg-card",
                )}
              >
                <p className={cn("eyebrow", isToday && "text-primary")}>{DAY_LABELS[index]}</p>
                <p className="tnum mt-0.5 font-display text-[15px] font-semibold">
                  {day.getDate()}
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {items.map((appt) => (
                    <div key={appt.id} className="panel-inset p-2">
                      <p className="tnum text-[11px] text-primary">{timeShort(appt.starts_at)}</p>
                      <p className="mt-0.5 truncate text-[12px] font-medium">{appt.name}</p>
                      <p className="mt-1">
                        <Pill tone={appointmentStatusMeta(appt.status).tone}>
                          {appointmentStatusMeta(appt.status).label}
                        </Pill>
                      </p>
                      {appt.status === "pending" ? (
                        <button
                          type="button"
                          className="mt-1.5 cursor-pointer text-[11px] text-primary hover:underline"
                          onClick={() =>
                            updateAppointment.mutate({ id: appt.id, status: "confirmed" })
                          }
                        >
                          Confirm
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Panel className="p-5">
        <SectionHeading eyebrow="All bookings" title="Upcoming and past" />
        {(appointments ?? []).length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No bookings yet"
              description="When customers book from your website, the appointment shows up here for you to confirm."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(appointments ?? []).map((appt) => (
              <li key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{appt.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {dateLong(appt.starts_at)} · {timeShort(appt.starts_at)}
                    {appt.phone ? ` · ${appt.phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={appointmentStatusMeta(appt.status).tone}>
                    {appointmentStatusMeta(appt.status).label}
                  </Pill>
                  <select
                    aria-label={`Status for ${appt.name}`}
                    value={appt.status}
                    onChange={(e) =>
                      updateAppointment.mutate({
                        id: appt.id,
                        status: e.target.value as AppointmentStatus,
                      })
                    }
                    className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-[12px]"
                  >
                    {["pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
