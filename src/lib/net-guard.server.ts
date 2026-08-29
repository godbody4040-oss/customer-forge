/**
 * Guards server-side fetches of user-supplied hostnames (custom domains).
 *
 * Without this, a client could point a "custom domain" at localhost, a private
 * network address, or a cloud metadata endpoint and use our server as a proxy
 * into the internal network (SSRF).
 */

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa", ".onion", ".test", ".invalid"];
const BLOCKED_HOSTS = new Set(["localhost", "metadata", "metadata.google.internal", "instance-data"]);

function isIpv4(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** True only for globally routable IPv4 addresses. */
export function isPublicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a >= 224) return false; // multicast / reserved
  return true;
}

/**
 * A hostname is only fetchable when it is a real public DNS name — never an IP
 * literal, never an internal/reserved suffix.
 */
export function isFetchableHostname(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  if (!h || h.length > 253) return false;
  if (h.includes(":") || h.includes("/") || h.includes("@")) return false;
  if (isIpv4(h)) return false;
  if (BLOCKED_HOSTS.has(h)) return false;
  if (BLOCKED_SUFFIXES.some((suffix) => h.endsWith(suffix))) return false;
  // Must be a dotted name with an alphabetic TLD of at least two letters.
  return /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(h);
}

/** Every resolved A record must be publicly routable before we fetch the host. */
export function areAddressesPublic(addresses: string[]): boolean {
  return addresses.every((ip) => isPublicIpv4(ip.trim()));
}

/** Throws when a hostname must not be fetched from the server. */
export function assertFetchableHostname(host: string): void {
  if (!isFetchableHostname(host)) throw new Error("That address can't be checked.");
}
