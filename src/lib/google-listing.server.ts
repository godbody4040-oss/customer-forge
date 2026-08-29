/**
 * Google Business listing import — server-only Places API (New) access.
 *
 * All calls go through the Lovable connector gateway; the Google credentials
 * never reach the browser. Only fields the client's own listing publishes are
 * requested, and the responses are mapped straight onto builder fields.
 */

import type { GoogleListingCandidate } from "@/lib/google-listing";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
].join(",");

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "editorialSummary",
  "regularOpeningHours",
  "reviews",
  "googleMapsUri",
].join(",");

type PlaceText = { text?: string } | undefined;
type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUri: string | null;
  summary: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  hoursLines: string[];
  reviews: { name: string; text: string; rating: number }[];
};

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google listing import isn't connected yet. Connect Google Maps Platform and try again.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function readError(response: Response) {
  const body = await response.text();
  console.error(`[google-listing] request failed [${response.status}]: ${body}`);
  if (response.status === 429) return "Google is rate limiting listing lookups. Try again in a minute.";
  if (response.status === 403) return "Google denied the listing lookup. Check the Google Maps connection.";
  return `Google couldn't complete the listing lookup (${response.status}).`;
}

const str = (value: PlaceText) => (typeof value?.text === "string" && value.text.trim() ? value.text.trim() : null);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Free-text search over Google's business listings, e.g. "Hop Hop Detail Raleigh". */
export async function searchListings(query: string): Promise<GoogleListingCandidate[]> {
  const response = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: "POST",
    headers: { ...headers(), "X-Goog-FieldMask": SEARCH_FIELDS },
    body: JSON.stringify({ textQuery: query, maxResultCount: 6 }),
  });
  if (!response.ok) throw new Error(await readError(response));

  const data = (await response.json()) as { places?: Record<string, unknown>[] };
  return (data.places ?? []).slice(0, 6).map((place) => ({
    placeId: String(place["id"] ?? ""),
    name: str(place["displayName"] as PlaceText) ?? "Unnamed listing",
    address: typeof place["formattedAddress"] === "string" ? place["formattedAddress"] : "",
    phone: typeof place["nationalPhoneNumber"] === "string" ? place["nationalPhoneNumber"] : null,
    website: typeof place["websiteUri"] === "string" ? place["websiteUri"] : null,
    category: str(place["primaryTypeDisplayName"] as PlaceText),
    rating: num(place["rating"]),
    reviewCount: num(place["userRatingCount"]),
    mapsUri: typeof place["googleMapsUri"] === "string" ? place["googleMapsUri"] : null,
  })).filter((candidate) => candidate.placeId.length > 0);
}

/** Everything the selected listing publishes, mapped onto builder fields. */
export async function fetchListingDetails(placeId: string): Promise<PlaceDetails> {
  const response = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { ...headers(), "X-Goog-FieldMask": DETAIL_FIELDS },
  });
  if (!response.ok) throw new Error(await readError(response));
  const place = (await response.json()) as Record<string, unknown>;

  const components = (Array.isArray(place["addressComponents"]) ? place["addressComponents"] : []) as AddressComponent[];
  const pick = (type: string, short = false) => {
    const match = components.find((c) => (c.types ?? []).includes(type));
    const value = short ? match?.shortText : match?.longText;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  const hours = place["regularOpeningHours"] as { weekdayDescriptions?: unknown } | undefined;
  const hoursLines = Array.isArray(hours?.weekdayDescriptions)
    ? (hours.weekdayDescriptions as unknown[]).filter((l): l is string => typeof l === "string").slice(0, 7)
    : [];

  const reviews = (Array.isArray(place["reviews"]) ? place["reviews"] : [])
    .map((raw) => {
      const review = raw as Record<string, unknown>;
      const author = review["authorAttribution"] as { displayName?: string } | undefined;
      return {
        name: typeof author?.displayName === "string" ? author.displayName.trim() : "Google reviewer",
        text: str(review["text"] as PlaceText) ?? "",
        rating: num(review["rating"]) ?? 0,
      };
    })
    .filter((review) => review.text.length > 20);

  return {
    id: String(place["id"] ?? placeId),
    name: str(place["displayName"] as PlaceText) ?? "",
    address: typeof place["formattedAddress"] === "string" ? place["formattedAddress"] : "",
    phone:
      typeof place["nationalPhoneNumber"] === "string"
        ? place["nationalPhoneNumber"]
        : typeof place["internationalPhoneNumber"] === "string"
          ? place["internationalPhoneNumber"]
          : null,
    website: typeof place["websiteUri"] === "string" ? place["websiteUri"] : null,
    category: str(place["primaryTypeDisplayName"] as PlaceText),
    rating: num(place["rating"]),
    reviewCount: num(place["userRatingCount"]),
    mapsUri: typeof place["googleMapsUri"] === "string" ? place["googleMapsUri"] : null,
    summary: str(place["editorialSummary"] as PlaceText),
    city: pick("locality") ?? pick("postal_town"),
    state: pick("administrative_area_level_1", true),
    zip: pick("postal_code"),
    county: pick("administrative_area_level_2"),
    hoursLines,
    reviews,
  };
}

/* ------------------------------ AI drafting ------------------------------ */

export type ListingDraft = {
  tagline: string;
  description: string;
  serviceArea: string;
  services: { name: string; description: string }[];
};

const MODEL = "google/gemini-3.7-flash";

/**
 * Turns the listing's own facts and review wording into a first draft the owner
 * edits. The prompt forbids inventing prices, guarantees, awards or claims.
 */
export async function draftFromListing(details: PlaceDetails): Promise<ListingDraft | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const facts = [
    `Business name: ${details.name}`,
    details.category ? `Google category: ${details.category}` : null,
    details.summary ? `Google summary: ${details.summary}` : null,
    details.address ? `Address: ${details.address}` : null,
    details.city ? `City: ${details.city}${details.state ? `, ${details.state}` : ""}` : null,
    details.county ? `County: ${details.county}` : null,
    details.rating && details.reviewCount ? `Google rating: ${details.rating} from ${details.reviewCount} reviews` : null,
    details.website ? `Existing website: ${details.website}` : null,
    details.reviews.length
      ? `Customer review wording (use only to infer which services they actually perform):\n${details.reviews
          .slice(0, 5)
          .map((r) => `- ${r.text.slice(0, 400)}`)
          .join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You write first-draft website content for local service businesses from their Google Business listing. " +
          "Use only the facts supplied. Never invent prices, guarantees, awards, licences, years in business, " +
          "staff counts or claims. Never state a review score unless it is given. Write in plain, confident " +
          "British-neutral English aimed at a customer ready to book. Reply with JSON only.",
      },
      {
        role: "user",
        content:
          `${facts}\n\nReturn JSON with exactly these keys:\n` +
          `{"tagline": "under 60 characters", "description": "2-3 sentences on what they do and who for", ` +
          `"serviceArea": "comma separated towns/areas implied by the address, or empty string", ` +
          `"services": [{"name": "service name", "description": "one sentence"}]}\n` +
          `Include between 3 and 6 services, only ones clearly implied by the category or review wording.`,
      },
    ],
    response_format: { type: "json_object" },
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`[google-listing] AI draft failed [${response.status}]: ${await response.text()}`);
    return null;
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Partial<ListingDraft>;
    const services = (Array.isArray(parsed.services) ? parsed.services : [])
      .filter((s): s is { name: string; description: string } => typeof s?.name === "string" && s.name.trim().length > 1)
      .slice(0, 6)
      .map((s) => ({
        name: s.name.trim().slice(0, 80),
        description: typeof s.description === "string" ? s.description.trim().slice(0, 300) : "",
      }));
    return {
      tagline: typeof parsed.tagline === "string" ? parsed.tagline.trim().slice(0, 120) : "",
      description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 900) : "",
      serviceArea: typeof parsed.serviceArea === "string" ? parsed.serviceArea.trim().slice(0, 200) : "",
      services,
    };
  } catch (error) {
    console.error("[google-listing] AI draft was not valid JSON", error);
    return null;
  }
}
