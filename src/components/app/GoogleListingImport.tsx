import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, Loader2, MapPin, Search, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importGoogleListing, searchGoogleListings } from "@/lib/google-listing.functions";
import {
  listingRating,
  listingSubtitle,
  type GoogleListingCandidate,
  type GoogleListingImport as ImportResult,
} from "@/lib/google-listing";

/**
 * "Build it from my Google listing" — the fastest possible start. The owner
 * types their business name, picks their real Google Business listing, and
 * Revora fills the builder with the facts Google already publishes, then drafts
 * the wording and service list for them to edit.
 */
export function GoogleListingImport({
  organizationId,
  canManage,
}: {
  organizationId: string | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const runSearch = useServerFn(searchGoogleListings);
  const runImport = useServerFn(importGoogleListing);
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<GoogleListingCandidate[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const search = useMutation({
    mutationFn: async (value: string) => runSearch({ data: { query: value } }),
    onSuccess: (data) => {
      setListings(data.listings);
      if (!data.listings.length) toast.info("No Google listings matched. Try adding your town or city.");
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't search Google listings."),
  });

  const apply = useMutation({
    mutationFn: async (placeId: string) => runImport({ data: { organizationId: organizationId!, placeId } }),
    onSuccess: (data) => {
      setResult(data);
      setListings(null);
      toast.success(`Imported ${data.listing.name} from Google.`);
      for (const key of ["business_profile", "workspace", "services", "score_facts", "build_readiness"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't import that listing."),
  });

  const busy = search.isPending || apply.isPending;

  return (
    <Panel className="p-5">
      <SectionHeading
        eyebrow="Fastest start"
        title="Build it from your Google listing"
        action={<Pill tone="signal">AI assisted</Pill>}
      />
      <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
        Revora reads your real Google Business Profile — name, category, phone, address, opening hours, rating
        and review quotes — then drafts your wording and service list from it. You only correct what&apos;s
        wrong. Nothing is invented: prices, guarantees and photos still come from you.
      </p>

      {canManage ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length >= 3) search.mutate(query.trim());
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="google-listing-query">Your business name and town</Label>
            <Input
              id="google-listing-query"
              value={query}
              placeholder="Hop Hop Detail, Raleigh NC"
              disabled={busy}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button type="submit" variant="signal" disabled={busy || query.trim().length < 3}>
            {search.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Find my listing
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-[12px] text-muted-foreground">Only owners and admins can import a listing.</p>
      )}

      {listings?.length ? (
        <ul className="mt-4 space-y-2">
          {listings.map((listing) => {
            const rating = listingRating(listing);
            return (
              <li
                key={listing.placeId}
                className="flex flex-col gap-3 rounded-md border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{listing.name}</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-[12px] text-muted-foreground">
                    <MapPin className="mt-0.5 size-3 shrink-0" />
                    <span className="break-words">{listingSubtitle(listing) || "No address published"}</span>
                  </p>
                  {rating ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-primary">
                      <Star className="size-3" /> {rating}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0"
                  disabled={busy || !organizationId}
                  onClick={() => apply.mutate(listing.placeId)}
                >
                  {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  This is my business
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {apply.isPending ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-primary" /> Reading your listing and drafting your
          content…
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4">
          <p className="text-[14px] font-medium">Imported from {result.listing.name}</p>
          <ul className="mt-2 space-y-1">
            {result.filled.length ? (
              result.filled.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-[13px] text-muted-foreground">
                Everything on your listing was already filled in — nothing needed changing.
              </li>
            )}
          </ul>
          {result.stillNeeded.length ? (
            <>
              <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                Still yours to add
              </p>
              <ul className="mt-1 space-y-1">
                {result.stillNeeded.map((item) => (
                  <li key={item} className="text-[13px] text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-3 text-[12px] text-muted-foreground">
            {result.aiWrote
              ? "The tagline, description and service drafts were written by Revora from your listing — read them below and change anything that isn't right."
              : "Your listing facts were imported. Write your description below in your own words."}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}
