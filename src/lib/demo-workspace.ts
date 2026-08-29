/**
 * Fictional demo dataset for the public Revora product demo.
 *
 * Every business, person, number, message and timestamp in this file is
 * invented for demonstration purposes only. Nothing here represents a real
 * customer, a real result, or a real performance claim. Build the dataset
 * lazily (never at module scope) so timestamps stay request-safe.
 */

export const DEMO_DISCLOSURE =
  "Demo data — fictional businesses and numbers created to show how Revora works. Not real customers, results, or performance claims.";

export type DemoStage =
  | "visitor"
  | "lead"
  | "qualified"
  | "quoted"
  | "follow_up"
  | "booked"
  | "customer"
  | "review"
  | "repeat";

export const DEMO_STAGES: { id: DemoStage; label: string; blurb: string }[] = [
  { id: "visitor", label: "Visitor", blurb: "Someone lands on the site from search, a QR code or an ad." },
  { id: "lead", label: "Lead", blurb: "They capture a quote or contact form — a lead record appears instantly." },
  { id: "qualified", label: "Qualified", blurb: "Service, location and timing are confirmed." },
  { id: "quoted", label: "Quote", blurb: "A priced estimate range is sent with add-ons." },
  { id: "follow_up", label: "Follow-up", blurb: "Automated email/SMS nudges run on a schedule." },
  { id: "booked", label: "Booking", blurb: "A time is reserved on the calendar with confirmations." },
  { id: "customer", label: "Customer", blurb: "Job completed and payment recorded." },
  { id: "review", label: "Review", blurb: "A review request goes out automatically." },
  { id: "repeat", label: "Repeat", blurb: "Recurring reminders bring them back." },
];

export type DemoLead = {
  id: string;
  name: string;
  city: string;
  service: string;
  stage: DemoStage;
  source: string;
  quoteLow: number;
  quoteHigh: number;
  daysAgo: number;
  phoneMasked: string;
  emailMasked: string;
  note: string;
  activity: { at: string; label: string; kind: "system" | "message" | "human" }[];
};

export type DemoBooking = {
  id: string;
  lead: string;
  service: string;
  when: string;
  daysAhead: number;
  status: "confirmed" | "pending" | "completed";
  value: number;
  tech: string;
};

export type DemoWorkspace = ReturnType<typeof buildDemoWorkspace>;

const relative = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ahead = (daysAhead: number) => {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const LEADS: Omit<DemoLead, "id">[] = [
  {
    name: "Marcus Whitfield",
    city: "Raleigh, NC",
    service: "Full interior + exterior detail",
    stage: "repeat",
    source: "Google — “mobile detailing near me”",
    quoteLow: 260,
    quoteHigh: 340,
    daysAgo: 41,
    phoneMasked: "(919) •••-4127",
    emailMasked: "m•••••@example.com",
    note: "Third booking. Wants the same 8am Saturday slot every quarter.",
    activity: [
      { at: "41 days ago", label: "Quote submitted from the pricing page", kind: "system" },
      { at: "41 days ago", label: "Estimate sent: $260 – $340", kind: "message" },
      { at: "39 days ago", label: "Booking confirmed — Saturday 8:00am", kind: "system" },
      { at: "38 days ago", label: "Job completed, payment recorded", kind: "human" },
      { at: "37 days ago", label: "Review request sent automatically", kind: "message" },
      { at: "6 days ago", label: "Recurring reminder → rebooked", kind: "system" },
    ],
  },
  {
    name: "Priya Raman",
    city: "Cary, NC",
    service: "Ceramic coating",
    stage: "customer",
    source: "Instagram bio link",
    quoteLow: 780,
    quoteHigh: 950,
    daysAgo: 12,
    phoneMasked: "(984) •••-2210",
    emailMasked: "p•••@example.com",
    note: "Paid deposit online. Asked about a maintenance plan.",
    activity: [
      { at: "12 days ago", label: "Lead captured from quote calculator", kind: "system" },
      { at: "12 days ago", label: "Auto follow-up #1 sent (email)", kind: "message" },
      { at: "10 days ago", label: "Call logged — coating package confirmed", kind: "human" },
      { at: "9 days ago", label: "Booking confirmed with deposit", kind: "system" },
      { at: "3 days ago", label: "Job completed", kind: "human" },
    ],
  },
  {
    name: "Devon Ackley",
    city: "Durham, NC",
    service: "Fleet detail — 6 vans",
    stage: "booked",
    source: "QR code on truck wrap",
    quoteLow: 1_150,
    quoteHigh: 1_450,
    daysAgo: 5,
    phoneMasked: "(919) •••-8804",
    emailMasked: "d•••••@example.com",
    note: "Needs invoicing to the business, not the driver.",
    activity: [
      { at: "5 days ago", label: "Scanned truck QR → landed on fleet page", kind: "system" },
      { at: "5 days ago", label: "Lead created, tagged “fleet”", kind: "system" },
      { at: "4 days ago", label: "Quote range sent with volume add-on", kind: "message" },
      { at: "2 days ago", label: "SMS follow-up → replied “Tuesday works”", kind: "message" },
      { at: "1 day ago", label: "Booking held for Tuesday 7:30am", kind: "system" },
    ],
  },
  {
    name: "Lauren Bishop",
    city: "Apex, NC",
    service: "Interior deep clean",
    stage: "follow_up",
    source: "Google Business Profile",
    quoteLow: 180,
    quoteHigh: 240,
    daysAgo: 3,
    phoneMasked: "(919) •••-6631",
    emailMasked: "l•••••@example.com",
    note: "Pet hair + spill. Comparing two providers.",
    activity: [
      { at: "3 days ago", label: "Quote submitted (interior only)", kind: "system" },
      { at: "3 days ago", label: "Estimate sent: $180 – $240", kind: "message" },
      { at: "2 days ago", label: "Follow-up #1 (email) delivered", kind: "message" },
      { at: "22 hours ago", label: "Follow-up #2 (SMS) scheduled", kind: "system" },
    ],
  },
  {
    name: "Terrance Mills",
    city: "Garner, NC",
    service: "Headlight restoration",
    stage: "quoted",
    source: "Facebook local group",
    quoteLow: 95,
    quoteHigh: 140,
    daysAgo: 2,
    phoneMasked: "(984) •••-1075",
    emailMasked: "t•••••@example.com",
    note: "Price-sensitive. Asked if a weekday discount exists.",
    activity: [
      { at: "2 days ago", label: "Lead captured from service page form", kind: "system" },
      { at: "2 days ago", label: "Estimate sent: $95 – $140", kind: "message" },
      { at: "1 day ago", label: "Text sent — awaiting reply", kind: "message" },
    ],
  },
  {
    name: "Nia Coleman",
    city: "Raleigh, NC",
    service: "Monthly maintenance wash",
    stage: "qualified",
    source: "Search — “detailing subscription raleigh”",
    quoteLow: 120,
    quoteHigh: 160,
    daysAgo: 1,
    phoneMasked: "(919) •••-3390",
    emailMasked: "n•••@example.com",
    note: "Two vehicles, wants recurring monthly service.",
    activity: [
      { at: "1 day ago", label: "Lead captured, service + city confirmed", kind: "system" },
      { at: "20 hours ago", label: "Qualified by owner — recurring plan fit", kind: "human" },
    ],
  },
  {
    name: "Owen Hartley",
    city: "Wake Forest, NC",
    service: "Exterior wash + wax",
    stage: "lead",
    source: "Direct link from flyer",
    quoteLow: 140,
    quoteHigh: 190,
    daysAgo: 0,
    phoneMasked: "(919) •••-7742",
    emailMasked: "o•••@example.com",
    note: "Submitted 40 minutes ago. First follow-up queued.",
    activity: [
      { at: "40 minutes ago", label: "Lead captured from quote calculator", kind: "system" },
      { at: "39 minutes ago", label: "Instant reply email sent", kind: "message" },
    ],
  },
  {
    name: "Sofia Duarte",
    city: "Morrisville, NC",
    service: "Engine bay cleaning",
    stage: "visitor",
    source: "Organic search (no form yet)",
    quoteLow: 0,
    quoteHigh: 0,
    daysAgo: 0,
    phoneMasked: "—",
    emailMasked: "—",
    note: "Viewed pricing twice today. Exit-intent offer shown.",
    activity: [
      { at: "5 hours ago", label: "Visited pricing page from search", kind: "system" },
      { at: "2 hours ago", label: "Returned, viewed booking page", kind: "system" },
    ],
  },
];

const BOOKINGS: Omit<DemoBooking, "id">[] = [
  { lead: "Devon Ackley", service: "Fleet detail — 6 vans", when: "7:30am", daysAhead: 2, status: "confirmed", value: 1_320, tech: "Andre" },
  { lead: "Marcus Whitfield", service: "Full detail", when: "8:00am", daysAhead: 4, status: "confirmed", value: 295, tech: "Andre" },
  { lead: "Nia Coleman", service: "Maintenance wash (x2)", when: "1:00pm", daysAhead: 5, status: "pending", value: 145, tech: "Unassigned" },
  { lead: "Lauren Bishop", service: "Interior deep clean", when: "10:30am", daysAhead: 7, status: "pending", value: 210, tech: "Jo" },
  { lead: "Priya Raman", service: "Ceramic coating", when: "9:00am", daysAhead: -3, status: "completed", value: 865, tech: "Andre" },
];

const AUTOMATIONS = [
  { name: "New lead — instant reply", trigger: "Lead created", timing: "Immediately", channel: "Email", sent: 128, replies: 41 },
  { name: "Quote follow-up #1", trigger: "Quote sent, no reply", timing: "After 24 hours", channel: "SMS", sent: 96, replies: 33 },
  { name: "Quote follow-up #2", trigger: "Quote sent, no reply", timing: "After 3 days", channel: "Email", sent: 61, replies: 14 },
  { name: "Booking reminder", trigger: "24h before appointment", timing: "1 day before", channel: "SMS", sent: 74, replies: 9 },
  { name: "Review request", trigger: "Job marked complete", timing: "2 hours after", channel: "Email + SMS", sent: 58, replies: 27 },
  { name: "Win-back / rebook", trigger: "No visit in 90 days", timing: "Day 90", channel: "Email", sent: 44, replies: 12 },
];

const REVIEWS = [
  { name: "Demo reviewer A", rating: 5, service: "Full detail", daysAgo: 4, text: "Sample review text used to show how requests and replies appear in the dashboard." },
  { name: "Demo reviewer B", rating: 5, service: "Ceramic coating", daysAgo: 11, text: "Placeholder review content — illustrative only, not a real customer statement." },
  { name: "Demo reviewer C", rating: 4, service: "Interior deep clean", daysAgo: 19, text: "Example of a 4-star review and the owner reply workflow." },
];

const TRAFFIC = [
  { source: "Google Search", visitors: 612, leads: 48, tone: "signal" as const },
  { source: "Google Business Profile", visitors: 388, leads: 39, tone: "info" as const },
  { source: "Instagram / Facebook", visitors: 244, leads: 17, tone: "attention" as const },
  { source: "QR codes & flyers", visitors: 131, leads: 14, tone: "neutral" as const },
  { source: "Direct / returning", visitors: 176, leads: 11, tone: "neutral" as const },
];

export const DEMO_RANGES = [
  { id: "7", label: "7 days", factor: 0.22 },
  { id: "30", label: "30 days", factor: 1 },
  { id: "90", label: "90 days", factor: 2.6 },
] as const;

export type DemoRangeId = (typeof DEMO_RANGES)[number]["id"];

export function buildDemoWorkspace() {
  const leads: DemoLead[] = LEADS.map((lead, index) => ({
    ...lead,
    id: `demo-lead-${index + 1}`,
    daysAgo: lead.daysAgo,
  }));

  const bookings: DemoBooking[] = BOOKINGS.map((b, index) => ({
    ...b,
    id: `demo-booking-${index + 1}`,
  }));

  return {
    business: {
      name: "Elite Mobile Detailing",
      tagline: "Mobile auto detailing — Raleigh–Durham, NC",
      note: "Fictional business used for this demo.",
    },
    leads,
    bookings,
    automations: AUTOMATIONS,
    reviews: REVIEWS,
    traffic: TRAFFIC,
    formatRelative: relative,
    formatAhead: ahead,
  };
}

export function demoMetrics(range: DemoRangeId) {
  const factor = DEMO_RANGES.find((r) => r.id === range)?.factor ?? 1;
  const round = (n: number) => Math.max(1, Math.round(n * factor));
  const leads = round(129);
  const booked = round(46);
  const quotes = round(103);
  return {
    leads,
    booked,
    quotes,
    quoteValue: round(31_400),
    bookedValue: round(14_820),
    followUps: round(287),
    visitors: round(1_551),
    conversion: Math.round((booked / leads) * 1000) / 10,
    avgQuote: Math.round(31_400 / 103),
    responseMinutes: 2,
    reviewsRequested: round(52),
    reviewsLeft: round(24),
    repeatRate: 31,
  };
}

export const STAGE_TONE: Record<DemoStage, "signal" | "attention" | "info" | "neutral"> = {
  visitor: "neutral",
  lead: "info",
  qualified: "info",
  quoted: "attention",
  follow_up: "attention",
  booked: "signal",
  customer: "signal",
  review: "signal",
  repeat: "signal",
};

export const stageLabel = (stage: DemoStage) =>
  DEMO_STAGES.find((s) => s.id === stage)?.label ?? stage;
