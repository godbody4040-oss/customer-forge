/**
 * Plain-English guide for every section type.
 *
 * The builder shows this next to each section so the owner always knows what a
 * section is for, why it earns enquiries, and what to type in each field. It is
 * presentation copy only — no behaviour depends on it.
 */

import { SECTION_LIBRARY } from "@/lib/website-content";

export type SectionGuide = {
  /** What this block is. */
  purpose: string;
  /** Why it helps the site win work — shown as the gold key line. */
  lead: string;
  headingHint: string;
  subHint: string;
  bodyHint: string;
  /** Seed instruction for the website assistant. */
  ask: string;
};

const DEFAULTS: Omit<SectionGuide, "purpose"> = {
  lead: "Every block should move the visitor one step closer to calling, booking or asking for a price.",
  headingHint: "Say the outcome the customer wants",
  subHint: "One short line of reassurance",
  bodyHint: "Two or three sentences in your own words",
  ask: "Rewrite this section so it pushes the visitor towards contacting me",
};

const GUIDES: Partial<Record<string, SectionGuide>> = {
  hero: {
    purpose: "The first screen. Visitors decide in seconds whether you can help them.",
    lead: "Name the job, the town and the action — this single block drives most of your enquiries.",
    headingHint: "e.g. Emergency roof repairs in Raleigh",
    subHint: "e.g. Same-day callouts, fixed prices, 7 days a week",
    bodyHint: "One short paragraph on who you help and how fast you answer",
    ask: "Rewrite my headline banner so it names the job, the town and a clear reason to call now",
  },
  trust_bar: {
    purpose: "A thin strip of reassurance directly under the headline.",
    lead: "Removes doubt before the visitor scrolls — licensed, insured, local, fast to answer.",
    headingHint: "e.g. Licensed, insured and local",
    subHint: "e.g. Answering calls in under 10 minutes",
    bodyHint: "Only claims you can genuinely stand behind",
    ask: "Write a trust strip using only facts I have already given you",
  },
  intro: {
    purpose: "A short introduction to your business.",
    lead: "Turns a stranger into someone who feels they know who they're calling.",
    headingHint: "e.g. About At Your Service Roofing",
    subHint: "e.g. Family-run, working in Raleigh since 2014",
    bodyHint: "Two sentences: what you do and who you do it for",
    ask: "Write a short, warm introduction for my business",
  },
  services: {
    purpose: "One card per service, pulled straight from your service list.",
    lead: "Lets visitors self-select the exact job they need, so the enquiry arrives already qualified.",
    headingHint: "e.g. What we do",
    subHint: "e.g. Repairs, replacements and inspections",
    bodyHint: "A line explaining how someone chooses between your services",
    ask: "Rewrite my services section so each service leads to a quote request",
  },
  pricing: {
    purpose: "Starting prices so visitors can judge whether you fit their budget.",
    lead: "Prices filter out time-wasters and massively increase the quality of enquiries.",
    headingHint: "e.g. Starting prices",
    subHint: "e.g. Every job quoted before we start",
    bodyHint: "Explain what changes the price, and that quotes are free",
    ask: "Write a pricing guide from my services and starting prices",
  },
  quote: {
    purpose: "Your instant quote form — it creates a lead in your CRM.",
    lead: "The strongest lead source on the site: people get a number and you get their details.",
    headingHint: "e.g. Get my price in 60 seconds",
    subHint: "e.g. No obligation, no site visit needed",
    bodyHint: "Tell the visitor exactly what happens after they submit",
    ask: "Rewrite my quote section so it feels quick, free and risk-free",
  },
  booking: {
    purpose: "Lets visitors pick a service and a time without phoning.",
    lead: "Captures the work that comes in after hours, when nobody can answer the phone.",
    headingHint: "e.g. Book your visit online",
    subHint: "e.g. Choose a slot that suits you",
    bodyHint: "Say what to expect on the day",
    ask: "Rewrite my booking section so choosing a time feels effortless",
  },
  reviews: {
    purpose: "Published customer reviews. Nothing is ever invented.",
    lead: "Proof from other customers is the single biggest reason people choose one local business over another.",
    headingHint: "e.g. What our customers say",
    subHint: "e.g. Verified reviews from local jobs",
    bodyHint: "A line inviting visitors to read more",
    ask: "Write an introduction for my reviews section",
  },
  gallery: {
    purpose: "Photos of real jobs from your media library.",
    lead: "Before-and-after photos prove quality faster than any paragraph.",
    headingHint: "e.g. Recent work",
    subHint: "e.g. Jobs completed across Raleigh",
    bodyHint: "Describe the kind of work shown",
    ask: "Write a caption-style introduction for my work photos",
  },
  faq: {
    purpose: "Answers to the questions people ask before they commit.",
    lead: "Every answered objection is an enquiry you would otherwise have lost.",
    headingHint: "e.g. Questions we get asked",
    subHint: "e.g. Straight answers, no jargon",
    bodyHint: "Anything you want to say before the questions",
    ask: "Write FAQs that answer the objections that stop people booking me",
  },
  guarantee: {
    purpose: "The promise you make — only what you actually offer.",
    lead: "Takes the risk off the customer, which is often the last thing standing in the way.",
    headingHint: "e.g. Our promise to you",
    subHint: "e.g. Workmanship guaranteed",
    bodyHint: "State the guarantee in plain words",
    ask: "Write my guarantee section using only the promise I actually offer",
  },
  offer: {
    purpose: "A time-limited offer. Hidden until you write one.",
    lead: "A reason to act today instead of 'later' — the main cause of lost leads.",
    headingHint: "e.g. This month only",
    subHint: "e.g. Free inspection with every repair quote",
    bodyHint: "The offer, who it applies to, and when it ends",
    ask: "Write a current offer that gives people a reason to call this week",
  },
  cta: {
    purpose: "A direct prompt to call, book or request a price.",
    lead: "Repeating the ask down the page is what turns readers into enquiries.",
    headingHint: "e.g. Ready for your free quote?",
    subHint: "e.g. Call, text or book — whatever suits you",
    bodyHint: "One line removing the last hesitation",
    ask: "Add a strong call to action with call, text, book and quote options",
  },
  sticky_cta: {
    purpose: "Always-visible call and quote buttons on mobile.",
    lead: "Most visitors are on a phone — this keeps the call button within thumb reach at all times.",
    headingHint: "e.g. Get my price",
    subHint: "Your phone number",
    bodyHint: "Usually left blank",
    ask: "Make my sticky mobile bar as clear and urgent as possible",
  },
  area: {
    purpose: "The main area you cover, written for local search.",
    lead: "Local wording is how you show up when someone searches your town.",
    headingHint: "e.g. Serving Raleigh, NC",
    subHint: "e.g. And 20 miles around",
    bodyHint: "Name the towns and neighbourhoods you cover",
    ask: "Write my service area section for local search",
  },
  areas: {
    purpose: "Links to every town or neighbourhood page.",
    lead: "One page per area is how local businesses win searches their competitors miss.",
    headingHint: "e.g. Areas we cover",
    subHint: "e.g. Pick your town for local prices",
    bodyHint: "A line introducing the list",
    ask: "Write an introduction for my service area list",
  },
  contact: {
    purpose: "Phone, email and opening hours.",
    lead: "Nobody should ever have to hunt for how to reach you.",
    headingHint: "e.g. Talk to us",
    subHint: "e.g. Call, text or email — we answer fast",
    bodyHint: "When you answer and how quickly you reply",
    ask: "Rewrite my contact section so getting in touch feels easy",
  },
  process: {
    purpose: "The three or four steps from enquiry to job done.",
    lead: "Showing the process removes the fear of 'what happens if I call?'.",
    headingHint: "e.g. How it works",
    subHint: "e.g. Three simple steps",
    bodyHint: "Describe each step in a sentence",
    ask: "Write a simple how-it-works section for my business",
  },
  benefits: {
    purpose: "Short reasons to choose you.",
    lead: "This is where you beat the competitor whose site says nothing.",
    headingHint: "e.g. Why customers choose us",
    subHint: "e.g. What makes us different",
    bodyHint: "Reasons that are true for you specifically",
    ask: "Write why-choose-us points that are specific to my business",
  },
  lead_magnet: {
    purpose: "Trades an email for something genuinely useful.",
    lead: "Captures the people who aren't ready to buy yet, so you can follow up later.",
    headingHint: "e.g. Free roof checklist",
    subHint: "e.g. Sent straight to your inbox",
    bodyHint: "What they get and why it helps",
    ask: "Write a free guide offer that captures emails from people not ready to buy",
  },
};

/** Guide for a section kind — always returns usable copy. */
export function sectionGuide(kind: string): SectionGuide {
  const found = GUIDES[kind];
  if (found) return found;
  const fallback = SECTION_LIBRARY.find((item) => item.kind === kind);
  return { ...DEFAULTS, purpose: fallback?.help ?? "A block of content on this page." };
}
