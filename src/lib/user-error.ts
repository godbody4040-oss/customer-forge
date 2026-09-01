/**
 * Client-facing error text.
 *
 * Business owners must never see database wording, constraint names, HTTP
 * status codes or stack traces. Server code already throws plain sentences for
 * anything the owner can act on ("That address is already taken."), so those
 * pass straight through. Anything that still looks technical is replaced with a
 * calm message plus a retry hint.
 */

/** Fragments that mark a message as internal rather than owner-facing. */
const TECHNICAL = [
  "row-level security",
  "rls",
  "violates",
  "constraint",
  "duplicate key",
  "postgrest",
  "pgrst",
  "relation ",
  "column ",
  "syntax error",
  "jwt",
  "supabase",
  "fetch failed",
  "failed to fetch",
  "networkerror",
  "internal server error",
  "500",
  "502",
  "503",
  "504",
  "unexpected token",
  "typeerror",
  "undefined is not",
  "null value in",
  "permission denied",
  "stack",
  "econn",
  "timeout of",
  "server function",
];

function raw(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message ?? "";
  if (typeof err === "object") {
    const e = err as { message?: unknown };
    if (typeof e.message === "string") return e.message;
  }
  return "";
}

/**
 * Returns a sentence safe to show a client. `fallback` should describe the
 * action that failed, e.g. "We couldn't save your changes. Please try again."
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again.") {
  const message = raw(err).trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (TECHNICAL.some((marker) => lower.includes(marker))) return fallback;
  // Long or multi-clause payloads are almost always machine output.
  if (message.length > 180 || message.includes(" — at ") || message.includes("{")) return fallback;

  return message;
}
