import { cn } from "@/lib/utils";
import revoraMark from "@/assets/revora-mark.png.asset.json";

/** Revora gold "R" mark — favicon / app icon / dashboard safe. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-primary/40 bg-elevated shadow-[0_0_18px_-6px_var(--color-gold)]",
        className,
      )}
    >
      <img
        src={revoraMark.url}
        alt=""
        aria-hidden="true"
        className="size-full object-contain"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

export function Logo({
  className,
  wordmark = true,
  tagline = false,
}: {
  className?: string;
  wordmark?: boolean;
  tagline?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {wordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[16px] font-bold tracking-[0.16em] text-foreground">
            REVORA
          </span>
          {tagline ? (
            <span className="mt-1 text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
              The Business Growth Operating System
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
