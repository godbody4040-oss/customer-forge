/**
 * Google Business listing import — shared, browser-safe types.
 *
 * Revora reads a client's real Google Maps listing and fills the builder with
 * it: name, category, phone, website, address, opening hours, rating and review
 * count. Nothing is invented — every imported value comes from the listing the
 * client selected, and AI-drafted wording is clearly labelled as a draft they
 * can edit.
 */

export type GoogleListingCandidate = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUri: string | null;
};

export type GoogleListingImport = {
  /** The listing that was imported. */
  listing: GoogleListingCandidate;
  /** Plain-language list of what was filled in, shown back to the client. */
  filled: string[];
  /** Things the listing didn't contain, so the client knows what's left. */
  stillNeeded: string[];
  /** How many review quotes were saved as social proof. */
  reviewsSaved: number;
  /** How many service ideas were drafted from the listing. */
  servicesDrafted: number;
  /** Whether AI wrote the draft tagline and description. */
  aiWrote: boolean;
};

export const listingSubtitle = (listing: GoogleListingCandidate) =>
  [listing.category, listing.address].filter(Boolean).join(" · ");

export const listingRating = (listing: GoogleListingCandidate) =>
  listing.rating && listing.reviewCount
    ? `${listing.rating.toFixed(1)} ★ · ${listing.reviewCount} Google reviews`
    : null;
