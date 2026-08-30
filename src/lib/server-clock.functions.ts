/**
 * Authoritative clock for the free-access trial.
 *
 * The trial deadline is stored per workspace in the database, but the browser
 * counts down against the device clock — which a client can set wrong (or an
 * old phone can simply drift). This returns the server's own time so the
 * dashboard countdown, and the moment access is cut, follow real elapsed time
 * from the second the client signed up.
 *
 * It exposes nothing but a timestamp, so it is safe to call unauthenticated.
 */
import { createServerFn } from "@tanstack/react-start";

export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({
  now: Date.now(),
}));
