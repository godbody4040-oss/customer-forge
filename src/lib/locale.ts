/**
 * REVORA GLOBALIZATION — locale-aware formatting for client-facing output.
 *
 * Core systems must not assume the United States. Everything here derives from
 * the country/locale the client supplied; when nothing was supplied, the helpers
 * fall back to the visitor's own locale in the browser and to a neutral,
 * unambiguous format on the server, rather than to a US-only assumption.
 */

export type RegionProfile = {
  country: string | null;
  locale: string;
  currency: string;
  timeZone: string | null;
  measurement: "metric" | "imperial";
  /** Postal-code label the client's customers will recognise. */
  postalLabel: string;
  /** Region-level label, e.g. state / province / county. */
  regionLabel: string;
  addressOrder: "street_city_region_postal" | "street_postal_city";
  phoneExample: string;
};

const REGIONS: Record<string, Omit<RegionProfile, "country" | "timeZone">> = {
  US: {
    locale: "en-US",
    currency: "USD",
    measurement: "imperial",
    postalLabel: "ZIP code",
    regionLabel: "State",
    addressOrder: "street_city_region_postal",
    phoneExample: "(555) 123 4567",
  },
  CA: {
    locale: "en-CA",
    currency: "CAD",
    measurement: "metric",
    postalLabel: "Postal code",
    regionLabel: "Province",
    addressOrder: "street_city_region_postal",
    phoneExample: "(555) 123 4567",
  },
  GB: {
    locale: "en-GB",
    currency: "GBP",
    measurement: "metric",
    postalLabel: "Postcode",
    regionLabel: "County",
    addressOrder: "street_postal_city",
    phoneExample: "07123 456789",
  },
  IE: {
    locale: "en-IE",
    currency: "EUR",
    measurement: "metric",
    postalLabel: "Eircode",
    regionLabel: "County",
    addressOrder: "street_postal_city",
    phoneExample: "085 123 4567",
  },
  AU: {
    locale: "en-AU",
    currency: "AUD",
    measurement: "metric",
    postalLabel: "Postcode",
    regionLabel: "State",
    addressOrder: "street_city_region_postal",
    phoneExample: "0412 345 678",
  },
  NZ: {
    locale: "en-NZ",
    currency: "NZD",
    measurement: "metric",
    postalLabel: "Postcode",
    regionLabel: "Region",
    addressOrder: "street_city_region_postal",
    phoneExample: "021 123 4567",
  },
  ZA: {
    locale: "en-ZA",
    currency: "ZAR",
    measurement: "metric",
    postalLabel: "Postal code",
    regionLabel: "Province",
    addressOrder: "street_city_region_postal",
    phoneExample: "071 123 4567",
  },
  DE: {
    locale: "de-DE",
    currency: "EUR",
    measurement: "metric",
    postalLabel: "Postleitzahl",
    regionLabel: "Bundesland",
    addressOrder: "street_postal_city",
    phoneExample: "0151 23456789",
  },
  FR: {
    locale: "fr-FR",
    currency: "EUR",
    measurement: "metric",
    postalLabel: "Code postal",
    regionLabel: "Région",
    addressOrder: "street_postal_city",
    phoneExample: "06 12 34 56 78",
  },
  ES: {
    locale: "es-ES",
    currency: "EUR",
    measurement: "metric",
    postalLabel: "Código postal",
    regionLabel: "Provincia",
    addressOrder: "street_postal_city",
    phoneExample: "612 345 678",
  },
  IN: {
    locale: "en-IN",
    currency: "INR",
    measurement: "metric",
    postalLabel: "PIN code",
    regionLabel: "State",
    addressOrder: "street_city_region_postal",
    phoneExample: "098765 43210",
  },
  AE: {
    locale: "en-AE",
    currency: "AED",
    measurement: "metric",
    postalLabel: "PO Box",
    regionLabel: "Emirate",
    addressOrder: "street_city_region_postal",
    phoneExample: "050 123 4567",
  },
};

/** Neutral profile used when the client hasn't told us where they trade. */
const NEUTRAL: Omit<RegionProfile, "country" | "timeZone"> = {
  locale: "en-GB",
  currency: "USD",
  measurement: "metric",
  postalLabel: "Postal code",
  regionLabel: "Region / state",
  addressOrder: "street_city_region_postal",
  phoneExample: "+1 555 123 4567",
};

export function regionProfile(input: {
  country?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  locale?: string | null;
}): RegionProfile {
  const code = (input.country ?? "").trim().toUpperCase().slice(0, 2);
  const base = REGIONS[code] ?? NEUTRAL;
  return {
    ...base,
    ...(input.locale ? { locale: input.locale } : {}),
    ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
    country: code || null,
    timeZone: input.timeZone ?? null,
  };
}

export function formatMoney(amount: number, profile: RegionProfile): string {
  try {
    return new Intl.NumberFormat(profile.locale, {
      style: "currency",
      currency: profile.currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${profile.currency} ${amount}`;
  }
}

export function formatDateTime(value: string | Date, profile: RegionProfile): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(profile.locale, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(profile.timeZone ? { timeZone: profile.timeZone } : {}),
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Turns a typed phone number into a safe `tel:` target. Keeps a leading `+` so
 * international numbers survive; strips everything else that isn't a digit.
 */
export function telHref(phone: string | null | undefined): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${plus ? "+" : ""}${digits}`;
}

/** Field labels for address forms, in the order that region expects. */
export function addressFields(profile: RegionProfile): string[] {
  return profile.addressOrder === "street_postal_city"
    ? ["Street address", profile.postalLabel, "Town / city", profile.regionLabel]
    : ["Street address", "Town / city", profile.regionLabel, profile.postalLabel];
}

/** Best-effort timezone for the current viewer. Never throws. */
export function viewerTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
