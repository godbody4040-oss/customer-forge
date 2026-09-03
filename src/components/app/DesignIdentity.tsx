/**
 * DESIGN IDENTITY — proves this site does not look like every other site.
 *
 * The fingerprint is derived from the client's real business facts plus their
 * organization id, so two roofers in the same town get measurably different
 * layouts. Nothing here is decorative: the same fingerprint feeds the design
 * instructions the assistant uses when it restyles the site.
 */

import { useMemo } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessDna, type DnaFacts } from "@/lib/business-dna";
import {
  describeFingerprint,
  designFingerprint,
  distinctFingerprint,
  type DesignFingerprint,
} from "@/lib/design-fingerprint";

export function DesignIdentity({
  organizationId,
  facts,
  peers,
  onRestyle,
}: {
  organizationId: string;
  facts: DnaFacts;
  /** Fingerprints of other sites to stay distinct from, when known. */
  peers?: DesignFingerprint[];
  onRestyle?: (instruction: string) => void;
}) {
  const { fingerprint, dna, revision } = useMemo(() => {
    const derived = businessDna(facts);
    const input = { organizationId, dna: derived };
    const base = designFingerprint(input);
    if (!peers?.length) return { fingerprint: base, dna: derived, revision: 0 };
    const distinct = distinctFingerprint(input, peers);
    return { fingerprint: distinct.fingerprint, dna: derived, revision: distinct.revision };
  }, [organizationId, facts, peers]);

  const rows: [string, string][] = [
    ["Layout", fingerprint.hero.replace(/-/g, " ")],
    ["Services", fingerprint.services.replace(/-/g, " ")],
    ["Type", fingerprint.fontHeading],
    ["Shape", fingerprint.radius],
    ["Density", fingerprint.density],
    ["Motion", fingerprint.motion.replace(/-/g, " ")],
  ];

  return (
    <section className="panel p-4" aria-labelledby="design-identity-title">
      <div className="flex items-center gap-2">
        <Fingerprint className="size-4 text-primary" aria-hidden />
        <p id="design-identity-title" className="text-[13px] font-semibold">
          Your design identity
        </p>
        <span className="ml-auto rounded-full border border-primary/40 px-2 py-0.5 text-[11px] text-primary">
          {fingerprint.id}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{describeFingerprint(fingerprint)}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/60 bg-background/40 p-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="text-[12px] capitalize">{value}</dd>
          </div>
        ))}
      </dl>
      {revision > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Adjusted {revision} {revision === 1 ? "time" : "times"} to stay visually distinct from
          other sites Revora has built.
        </p>
      ) : null}
      {dna.needed.length ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Add {dna.needed.slice(0, 2).join(" and ")} and Revora can make this design work harder.
        </p>
      ) : null}
      {onRestyle ? (
        <Button
          className="mt-3"
          size="sm"
          variant="outline"
          onClick={() =>
            onRestyle(
              `Restyle my site with a different visual direction from ${fingerprint.id}: keep all my content and facts, change layout, spacing and type feel only.`,
            )
          }
        >
          Try a different direction
        </Button>
      ) : null}
    </section>
  );
}
