/**
 * Classification of the `payment_events` claim insert used for Stripe webhook
 * idempotency.
 *
 * A duplicate delivery (unique-violation on `provider_event_id`) is safe to
 * acknowledge with 200. Any OTHER database failure — outage, timeout, broken
 * connection, permission problem — must NOT be mistaken for a duplicate, or a
 * real payment event would be dropped forever. Those return a retryable status
 * so Stripe re-delivers.
 */
export type ClaimOutcome = "claimed" | "duplicate" | "transient";

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = "23505";

export function classifyClaimError(error: DbError): "duplicate" | "transient" {
  if (!error) return "duplicate";
  if (error.code === UNIQUE_VIOLATION) return "duplicate";
  const message = String(error.message ?? "").toLowerCase();
  if (
    message.includes("duplicate key value") ||
    message.includes("already exists") ||
    message.includes("violates unique constraint")
  ) {
    return "duplicate";
  }
  return "transient";
}

/** Digs the tenant id out of the common Stripe metadata locations. */
export function organizationIdFromStripeObject(object: unknown): string | null {
  const read = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const md = (value as { metadata?: Record<string, unknown> | null }).metadata;
    const id = md?.["organizationId"];
    return typeof id === "string" && id ? id : null;
  };
  const obj = object as Record<string, unknown> | null;
  if (!obj) return null;
  return (
    read(obj) ??
    read(obj["subscription_details"]) ??
    read((obj["lines"] as { data?: unknown[] } | undefined)?.data?.[0]) ??
    read(obj["customer"]) ??
    read(obj["subscription"]) ??
    null
  );
}
