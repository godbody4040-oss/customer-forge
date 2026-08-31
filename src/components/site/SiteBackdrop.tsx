/**
 * Renders the site-wide animated backdrop chosen in the builder or by the
 * Website Assistant. Pure CSS layers — no canvas, no scripts, no client data —
 * so it is safe under SSR, cheap on mobile, and disabled automatically for
 * visitors who prefer reduced motion.
 */
import type { BackdropId } from "@/lib/site-effects";
import { VisualComposition } from "@/components/site/VisualComposition";
import type { VisualComposition as Composition } from "@/lib/visual-composition";

export function SiteBackdrop({
  backdrop,
  composition = null,
}: {
  backdrop: BackdropId;
  /** Infinite Creative Engine composition; when present it replaces the preset. */
  composition?: Composition | null;
}) {
  if (composition && composition.layers.length) {
    return <VisualComposition composition={composition} />;
  }
  if (backdrop === "none") return null;
  return (
    <div aria-hidden className={`fx-backdrop fx-backdrop-${backdrop.replace(/_/g, "-")}`}>
      <span className="fx-layer fx-layer-1" />
      <span className="fx-layer fx-layer-2" />
      <span className="fx-layer fx-layer-3" />
    </div>
  );
}
