import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground",
        className,
      )}
    >
      CF
    </span>
  );
}

export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {wordmark ? (
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Customer Forge
        </span>
      ) : null}
    </span>
  );
}
