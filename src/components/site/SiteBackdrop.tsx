/**
 * Renders the site-wide animated backdrop chosen in the builder or by the
 * Website Assistant. Pure CSS layers — no canvas, no scripts, no client data —
 * so it is safe under SSR, cheap on mobile, and disabled automatically for
 * visitors who prefer reduced motion.
 */
import type { BackdropId } from "@/lib/site-effects";

export function SiteBackdrop({ backdrop }: { backdrop: BackdropId }) {
  if (backdrop === "none") return null;
  return (
    <div aria-hidden className={`fx-backdrop fx-backdrop-${backdrop.replace(/_/g, "-")}`}>
      <span className="fx-layer fx-layer-1" />
      <span className="fx-layer fx-layer-2" />
      <span className="fx-layer fx-layer-3" />
    </div>
  );
}
