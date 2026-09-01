/**
 * Monthly business report aggregation.
 *
 * Pure functions so the numbers are unit-testable without a database: the
 * server function fetches rows, this module turns them into months.
 *
 * Revenue counts only money Revora actually collected — completed and
 * partially_refunded payments, minus whatever was refunded. Created, pending,
 * failed and cancelled payments are NOT revenue, and fully refunded payments
 * net to zero.
 */

export type MonthKey = string; // "YYYY-MM"

export interface PaymentRow {
  organization_id: string | null;
  amount: number | string | null;
  status: string | null;
  refunded_amount?: number | string | null;
  completed_at?: string | null;
  created_at: string | null;
}

export interface DatedRow {
  organization_id: string | null;
  created_at: string | null;
}

export interface TrafficRow extends DatedRow {
  event_type?: string | null;
  session_id?: string | null;
}

export interface WorkspaceMonth {
  month: MonthKey;
  organizationId: string;
  revenue: number;
  refunded: number;
  leads: number;
  bookings: number;
  visits: number;
  visitors: number;
}

export interface MonthTotals {
  month: MonthKey;
  label: string;
  revenue: number;
  refunded: number;
  leads: number;
  bookings: number;
  visits: number;
  visitors: number;
  workspaces: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** UTC month bucket for an ISO timestamp. Returns null for unusable input. */
export function monthKey(iso: string | null | undefined): MonthKey | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" -> "Aug 2026". */
export function monthLabel(key: MonthKey): string {
  const [year, month] = key.split("-");
  const index = Number(month) - 1;
  return `${MONTH_LABELS[index] ?? month} ${year}`;
}

/** The most recent `count` month keys, newest first, ending at `now`. */
export function recentMonths(count: number, now = new Date()): MonthKey[] {
  const months: MonthKey[] = [];
  const total = Math.max(1, Math.min(36, Math.trunc(count)));
  for (let back = 0; back < total; back += 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    months.push(monthKey(cursor.toISOString())!);
  }
  return months;
}

/** Inclusive start timestamp of the oldest month in the window. */
export function windowStart(months: MonthKey[]): string {
  const oldest = months[months.length - 1] ?? monthKey(new Date().toISOString())!;
  const [year, month] = oldest.split("-").map(Number);
  return new Date(Date.UTC(year!, (month ?? 1) - 1, 1)).toISOString();
}

const money = (value: number | string | null | undefined) => {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Statuses where money was actually captured. */
const COLLECTED = new Set(["completed", "partially_refunded", "refunded", "disputed"]);

/** Net revenue for one payment row: captured amount minus refunds. */
export function netRevenue(row: PaymentRow): { gross: number; refunded: number; net: number } {
  if (!COLLECTED.has(String(row.status))) return { gross: 0, refunded: 0, net: 0 };
  const gross = money(row.amount);
  // A fully refunded payment may not carry an explicit refunded_amount.
  const refunded =
    row.status === "refunded" && money(row.refunded_amount) === 0
      ? gross
      : Math.min(gross, money(row.refunded_amount));
  return { gross, refunded, net: Math.max(0, gross - refunded) };
}

interface BuildInput {
  months: MonthKey[];
  payments: PaymentRow[];
  leads: DatedRow[];
  bookings: DatedRow[];
  traffic: TrafficRow[];
}

/**
 * Builds one row per (month, workspace) that had any activity, plus the
 * per-month platform totals. Rows outside the requested window are ignored.
 */
export function buildMonthlyReport(input: BuildInput): {
  months: MonthTotals[];
  rows: WorkspaceMonth[];
} {
  const wanted = new Set(input.months);
  const cells = new Map<string, WorkspaceMonth>();
  const sessions = new Map<string, Set<string>>();

  const cell = (month: MonthKey, organizationId: string) => {
    const key = `${month}|${organizationId}`;
    let existing = cells.get(key);
    if (!existing) {
      existing = {
        month,
        organizationId,
        revenue: 0,
        refunded: 0,
        leads: 0,
        bookings: 0,
        visits: 0,
        visitors: 0,
      };
      cells.set(key, existing);
    }
    return existing;
  };

  for (const row of input.payments) {
    // Revenue lands in the month the money was captured, not the month the
    // checkout session was created.
    const month = monthKey(row.completed_at ?? row.created_at);
    if (!month || !wanted.has(month) || !row.organization_id) continue;
    const { refunded, net } = netRevenue(row);
    if (net === 0 && refunded === 0) continue;
    const target = cell(month, row.organization_id);
    target.revenue += net;
    target.refunded += refunded;
  }

  for (const row of input.leads) {
    const month = monthKey(row.created_at);
    if (!month || !wanted.has(month) || !row.organization_id) continue;
    cell(month, row.organization_id).leads += 1;
  }

  for (const row of input.bookings) {
    const month = monthKey(row.created_at);
    if (!month || !wanted.has(month) || !row.organization_id) continue;
    cell(month, row.organization_id).bookings += 1;
  }

  for (const row of input.traffic) {
    const month = monthKey(row.created_at);
    if (!month || !wanted.has(month) || !row.organization_id) continue;
    const target = cell(month, row.organization_id);
    target.visits += 1;
    if (row.session_id) {
      const key = `${month}|${row.organization_id}`;
      const seen = sessions.get(key) ?? new Set<string>();
      seen.add(row.session_id);
      sessions.set(key, seen);
    }
  }

  for (const [key, seen] of sessions) {
    const target = cells.get(key);
    if (target) target.visitors = seen.size;
  }

  const rows = [...cells.values()].sort(
    (a, b) => b.month.localeCompare(a.month) || b.revenue - a.revenue || b.leads - a.leads,
  );

  const months: MonthTotals[] = input.months.map((month) => {
    const scoped = rows.filter((row) => row.month === month);
    return {
      month,
      label: monthLabel(month),
      revenue: scoped.reduce((sum, row) => sum + row.revenue, 0),
      refunded: scoped.reduce((sum, row) => sum + row.refunded, 0),
      leads: scoped.reduce((sum, row) => sum + row.leads, 0),
      bookings: scoped.reduce((sum, row) => sum + row.bookings, 0),
      visits: scoped.reduce((sum, row) => sum + row.visits, 0),
      visitors: scoped.reduce((sum, row) => sum + row.visitors, 0),
      workspaces: scoped.length,
    };
  });

  return { months, rows };
}

/** Month-over-month change as a percentage, or null when there is no base. */
export function growth(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/** Visit -> lead conversion rate for a month, as a percentage. */
export function conversionRate(month: Pick<MonthTotals, "leads" | "visits">): number | null {
  if (!month.visits) return null;
  return (month.leads / month.visits) * 100;
}
