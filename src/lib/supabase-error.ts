/**
 * Turns anything thrown by a Supabase/PostgREST call into a message a real
 * person can act on. PostgREST errors are plain objects (not Error), so the
 * usual `err instanceof Error` check swallowed them into "Something went
 * wrong" and hid the real cause from both the client and support.
 */
export function supabaseErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [e.message, e.details, e.hint].filter(
      (p): p is string => typeof p === "string" && !!p,
    );
    if (parts.length) return parts.join(" — ");
    if (typeof e.code === "string" && e.code) return `Request failed (${e.code}).`;
  }
  return fallback;
}

/** Throws a readable Error when a Supabase mutation returned an error. */
export function assertNoError(error: unknown, context: string): void {
  if (!error) return;
  throw new Error(`${context}: ${supabaseErrorMessage(error, "unexpected database error")}`);
}
