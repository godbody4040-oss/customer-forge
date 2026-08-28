import { cn } from "@/lib/utils";

/** Geometric "R" mark — favicon / app icon / dashboard safe. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md border border-primary/35 bg-elevated",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
        <path
          d="M7 20V4h6.6a4.7 4.7 0 0 1 0 9.4H7"
          stroke="var(--color-gold)"
          strokeWidth="2.4"
          strokeLinecap="square"
        />
        <path
          d="M12.4 13.4 18 20"
          stroke="var(--color-gold-soft)"
          strokeWidth="2.4"
          strokeLinecap="square"
        />
      </svg>
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
