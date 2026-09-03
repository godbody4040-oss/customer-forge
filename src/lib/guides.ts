/**
 * Free guides.
 *
 * These are genuinely useful, verifiable how-tos for local business owners.
 * They exist to earn organic and AI-search traffic on informational queries,
 * and they only contain advice that is true independently of Revora — no
 * invented statistics, no fake case studies, no promised rankings.
 */

import { GROWTH_SYSTEM, usdExact } from "@/lib/offer";

const MONTHLY = usdExact(GROWTH_SYSTEM.monthlyPrice);

export interface GuideStep {
  title: string;
  body: string;
}

export interface Guide {
  slug: string;
  title: string;
  /** Search-facing page title. */
  metaTitle: string;
  description: string;
  intro: string;
  readMinutes: number;
  steps: readonly GuideStep[];
  takeaway: string;
  faqs: readonly { q: string; a: string }[];
}

export const GUIDES: readonly Guide[] = [
  {
    slug: "get-more-google-reviews",
    title: "How to get more Google reviews (without being weird about it)",
    metaTitle: "How to get more Google reviews for a local business — step by step",
    description:
      "A practical, policy-safe process for local businesses to earn more Google reviews: when to ask, exactly what to say, how to make it one tap, and how to handle a bad one.",
    intro:
      "Reviews are the cheapest competitive advantage a local business has, and almost every business under-collects them for the same reason: asking is awkward and easy to forget. The fix is a repeatable process, not more courage.",
    readMinutes: 5,
    steps: [
      {
        title: "Ask at the moment of relief, not the moment of payment",
        body: "The best time is right after the customer sees the result and says something positive — the clean driveway, the cool air, the finished cut. That is when the sentiment is highest. Asking while they are pulling out a card mixes the request with spending money.",
      },
      {
        title: "Make it one tap, never a search",
        body: "Send the direct Google review link by text. Every extra step — open Maps, find the business, scroll, tap stars — loses people. If they have to look you up, most will not.",
      },
      {
        title: "Use a short, human script",
        body: "\"Really glad you're happy with it. If you have 30 seconds, a quick Google review helps a lot — here's the link.\" That is enough. Long requests read like marketing and get ignored.",
      },
      {
        title: "Never offer anything in exchange",
        body: "Discounts, entries and gifts for reviews violate Google's policies and can get reviews removed or your profile penalised. Ask everyone, incentivise no one.",
      },
      {
        title: "Automate the reminder, not the review",
        body: "The request should fire automatically after a job is marked complete, with one polite follow-up if there is no response. That is the entire difference between businesses with 12 reviews and businesses with 200.",
      },
      {
        title: "Answer every review, especially the bad one",
        body: "Reply to positives briefly and specifically. For a negative, respond once, publicly, calmly: acknowledge, state what you are doing about it, and move the detail to a phone call. Future customers are reading how you handle problems, not whether you ever had one.",
      },
      {
        title: "Route unhappy customers to you first",
        body: "Ask for private feedback before the public request when a job did not go perfectly. That is not review gating if you still let anyone review you publicly — it just means you hear about problems before the internet does.",
      },
    ],
    takeaway:
      "A review engine is a trigger, a link and a follow-up. Revora runs all three automatically after each completed job, and keeps private feedback separate from public requests.",
    faqs: [
      {
        q: "How many reviews do I need?",
        a: "There is no threshold that guarantees anything. What matters competitively is having more recent, more specific reviews than the businesses you appear next to in local results.",
      },
      {
        q: "Can I remove a bad review?",
        a: "Only if it violates Google's policies (spam, conflict of interest, off-topic, hate speech) — you can report it, but a genuine unhappy customer's review will stay. Answering it well is the real remedy.",
      },
    ],
  },
  {
    slug: "show-up-in-google-map-pack",
    title: "How to show up in the Google map pack for your city",
    metaTitle: "How to rank in the Google map pack — local SEO checklist for service businesses",
    description:
      "The concrete, non-mysterious work behind local map results: profile completeness, service and city pages, structured data, reviews, proximity and consistency.",
    intro:
      "The three local results at the top of a Google search are decided mostly by relevance, distance and prominence. You cannot move your customers closer to you, but relevance and prominence are both work you can actually do.",
    readMinutes: 6,
    steps: [
      {
        title: "Complete your Google Business Profile properly",
        body: "Primary category exactly right, secondary categories for real additional services, service areas you truly cover, hours, phone, website, and photos that are actually yours. Incomplete profiles lose to complete ones with the same distance.",
      },
      {
        title: "Match your website to what the profile claims",
        body: "If your profile says water heater installation, there should be a page about water heater installation. Relevance is judged on your site's content, not only on your profile categories.",
      },
      {
        title: "Give every real service its own page",
        body: "One page listing eight services competes for nothing. Eight pages, each answering one job — what it includes, what it typically costs, how long it takes, who it is for — competes for eight searches.",
      },
      {
        title: "Build genuine city and service-area pages",
        body: "A page per place you actually work, with real content about working there: neighbourhoods, common property types, travel notes, local jobs you do. Do not spin out fifty near-identical pages for towns you will not drive to; that is what gets ignored or filtered.",
      },
      {
        title: "Add structured data",
        body: "LocalBusiness or the specific business type, plus Service and Breadcrumb markup, tells search engines and AI assistants your name, phone, area served and offers in machine-readable form. It does not buy a ranking; it removes ambiguity.",
      },
      {
        title: "Be consistent everywhere",
        body: "Identical business name, phone number and address across your site, Google, Bing Places, Apple Business Connect, Facebook and any directory listing you have. Inconsistency is one of the few purely self-inflicted local ranking problems.",
      },
      {
        title: "Keep reviews recent",
        body: "Prominence includes review volume, rating and recency. A steady trickle beats a burst two years ago.",
      },
      {
        title: "Make the site fast on a phone",
        body: "Local searches are overwhelmingly mobile. A page that takes five seconds loses the customer before ranking matters at all.",
      },
    ],
    takeaway:
      "Local ranking is completeness, relevance and prominence, done consistently. Revora ships the site-side half of that list by default — service pages, real service-area pages, structured data, speed and the review engine.",
    faqs: [
      {
        q: "How long does local SEO take?",
        a: "Profile and consistency fixes can show up in weeks; content and review prominence compound over months. Anyone promising a specific position by a specific date is guessing.",
      },
      {
        q: "Do I need a physical address?",
        a: "No. Service-area businesses can hide the address and list the areas they serve. What you cannot do is invent a location you do not operate from.",
      },
    ],
  },
  {
    slug: "respond-to-leads-faster",
    title: "Why speed to lead decides who wins the job",
    metaTitle: "Speed to lead: how fast local businesses should reply to enquiries",
    description:
      "How to reply to every enquiry within minutes without living on your phone: instant first replies, quote ranges, one pipeline, and a follow-up sequence that finishes the conversation.",
    intro:
      "Two businesses with identical prices and identical reviews do not get identical results. In local services, the one that replies first usually gets the job, because the customer is contacting several businesses and stops as soon as someone competent answers.",
    readMinutes: 4,
    steps: [
      {
        title: "Send an instant first reply, automatically",
        body: "The first message does not have to be the quote. It has to confirm a human is coming: what you received, when you will reply properly, and what they can do meanwhile. This alone stops most customers from continuing to shop.",
      },
      {
        title: "Give a price range before a site visit",
        body: "Most customers are not asking for a final number, they are checking whether you are in their universe. A structured quote form that returns a range filters out the wrong jobs and warms the right ones.",
      },
      {
        title: "Put every channel in one place",
        body: "Calls, form fills, texts, DMs and bookings should land in one pipeline. Leads are lost in the gaps between apps far more often than they are lost to competitors.",
      },
      {
        title: "Follow up on a schedule, not on a mood",
        body: "A quote that gets one reply attempt is a quote you gave away. Two or three spaced follow-ups over a week, then a final polite close, converts jobs that were never lost — just forgotten.",
      },
      {
        title: "Track which channel produces paying customers",
        body: "Not clicks, not impressions — booked jobs. Once you can see that, you stop funding the channel that only produces traffic.",
      },
    ],
    takeaway:
      "Speed to lead is a system property, not a discipline problem. Revora replies instantly, quotes automatically, holds everything in one pipeline and runs the follow-up sequence for you.",
    faqs: [
      {
        q: "Is an automatic reply impersonal?",
        a: "Not if it is honest and specific. Customers accept \"we've got your request and will text you a range within the hour\" far better than silence.",
      },
      {
        q: "What if I cannot answer for hours?",
        a: `That is exactly the case this solves. The system covers the gap and holds the lead until you can. It costs ${MONTHLY}/month and never sleeps.`,
      },
    ],
  },
  {
    slug: "price-your-services",
    title: "How to publish prices without losing money",
    metaTitle: "How to price and publish local service prices — starting-at ranges that qualify buyers",
    description:
      "A practical approach to showing prices on a local service website: starting-at ranges, factor-based quoting, what never to publish, and how pricing filters bad jobs.",
    intro:
      "\"Call for a quote\" costs you the customers who were ready to buy and only wanted to know if you were in range. Publishing something — not everything — is almost always more profitable than publishing nothing.",
    readMinutes: 5,
    steps: [
      {
        title: "Publish a floor, not a ceiling",
        body: "A starting-at price sets expectations and removes the customers hunting for the cheapest possible option. It does not commit you to a number for a job you have not seen.",
      },
      {
        title: "Price on factors you can ask about",
        body: "Square footage, vehicle size, bedrooms, roof pitch, system age, frequency. If the factor can be a question, the quote can be automated.",
      },
      {
        title: "Give a range, then explain the range",
        body: "A range plus one sentence about what moves it (\"heavier soiling and pet hair move this up\") is credible. A bare number invites an argument later.",
      },
      {
        title: "Charge for the visit when the visit is the work",
        body: "For diagnostic trades, a stated service call fee filters out tyre-kickers and protects your day. Say it plainly on the page.",
      },
      {
        title: "Never publish your worst-case discount",
        body: "Whatever number is visible becomes the anchor for every negotiation. Publish the range you actually want to work in.",
      },
      {
        title: "Revisit prices on a schedule",
        body: "Costs move. Pick a quarter, review your ranges, and update the site — a quoting system that is one edit away makes this a five-minute job instead of a project.",
      },
    ],
    takeaway:
      "Published ranges qualify buyers before they cost you a drive. Revora's quote builder turns your factors and add-ons into an instant range and sends you the completed answers with the lead.",
    faqs: [
      {
        q: "Won't competitors see my prices?",
        a: "They already can, by requesting a quote. Their knowing your range costs you far less than the customers who left because nothing was shown.",
      },
      {
        q: "What if my jobs are too custom to price?",
        a: "Then price the entry point and the common cases, and be explicit that complex work is quoted after a visit. Something beats nothing.",
      },
    ],
  },
  {
    slug: "local-business-website-checklist",
    title: "The local business website checklist that actually converts",
    metaTitle: "Local business website checklist — what a service site needs to convert",
    description:
      "Everything a local service website needs to turn visitors into booked jobs: above-the-fold clarity, tap-to-call, real service pages, proof, quoting, booking, speed and tracking.",
    intro:
      "Most local websites fail for boring, fixable reasons. Work down this list and fix what is missing; it is worth more than any redesign.",
    readMinutes: 6,
    steps: [
      {
        title: "Say what you do, where, in the first line",
        body: "A visitor should know your trade and your area without scrolling. \"Fast AC repair across Charlotte and the surrounding counties\" beats any tagline.",
      },
      {
        title: "One obvious primary action",
        body: "Call, book or get a quote — pick the one that makes you money and make it the loudest thing on the page, repeated at the top, middle and bottom.",
      },
      {
        title: "Tap-to-call in the header on mobile",
        body: "A phone number that is not a link is a phone number nobody dials.",
      },
      {
        title: "A page per real service",
        body: "What it includes, what it starts at, how long it takes, what happens next. This is what search engines rank and what customers read.",
      },
      {
        title: "Real service-area coverage",
        body: "List the places you genuinely work and say plainly whether you travel. Vague coverage loses customers who assumed you were too far away.",
      },
      {
        title: "Proof that is yours",
        body: "Your photos, your reviews, your licence and insurance details. Stock imagery and generic badges reduce trust rather than build it.",
      },
      {
        title: "A quote path that works without a phone call",
        body: "Structured questions, a real range, and a lead that arrives complete.",
      },
      {
        title: "Booking against real availability",
        body: "If a customer can book while you are on a job, you stop losing the ones who will not wait for a callback.",
      },
      {
        title: "Speed and mobile layout",
        body: "Compressed images, no layout shift, buttons big enough for a thumb. Test it on your own phone on mobile data, not on office wifi.",
      },
      {
        title: "Tracking that ties leads to sources",
        body: "You need to know which page and channel produced booked work, otherwise every marketing decision is a guess.",
      },
      {
        title: "The boring essentials",
        body: "HTTPS, a sitemap, correct business structured data, an indexable site, and a 404 page that sends people somewhere useful.",
      },
    ],
    takeaway:
      "This checklist is exactly what Revora generates by default — including quoting, booking, CRM, follow-up, reviews, structured data and attribution — instead of leaving it as homework.",
    faqs: [
      {
        q: "Do I need a blog?",
        a: "Not to start. Service pages, service-area pages and reviews produce more local revenue per hour of effort than a blog does. Add helpful content later, once the money pages exist.",
      },
      {
        q: "How many pages should a local site have?",
        a: "As many as you have real services and real places, plus about, contact, pricing and proof. Fewer than that leaves searches uncovered; padding with thin pages does not help.",
      },
    ],
  },
] as const;

export function findGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export function guidePaths(): string[] {
  return ["/guides", ...GUIDES.map((g) => `/guides/${g.slug}`)];
}
