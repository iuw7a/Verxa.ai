/**
 * Flyvia deep links — client-safe (no "server-only" import; used by UI too).
 *
 * Verified against the live flyvia.de site (2026-09):
 *   ✅ /flights/from-to/{origin}-to-{destination}  — real dynamic route,
 *      returns a titled page like "Flights from Berlin to Istanbul — compare fares · flyVia"
 *      for every supported city pair (cities, lowercase, hyphenated slugs).
 *   ❌ /flights/search?from=…  — NOT a real route (renders their 404 page).
 *   ✅ /flights/to/{city}      — real destination pages (12 cities).
 *
 * The Flyvia search API serves any IATA pair, but their website only has
 * content pages for a known city set. For pairs outside that set we fall
 * back to the homepage, where the full flight-search form lives.
 */

/** Cities with real pages on flyvia.de (slug → verified HTTP 200). */
const FLYVIA_CITIES = new Set([
  "berlin", "istanbul", "paris", "london", "amsterdam", "dubai",
  "bangkok", "tokyo", "barcelona", "lisbon", "rome", "new-york",
]);

/** IATA → flyvia.de city slug (only cities with real site pages). */
const IATA_TO_CITY: Record<string, string> = {
  BER: "berlin",
  IST: "istanbul",
  CDG: "paris",
  ORY: "paris",
  LHR: "london",
  LGW: "london",
  AMS: "amsterdam",
  DXB: "dubai",
  BKK: "bangkok",
  HND: "tokyo",
  NRT: "tokyo",
  BCN: "barcelona",
  LIS: "lisbon",
  FCO: "rome",
  JFK: "new-york",
};

/** IATA codes we can map to a supported flyvia.de city slug. */
export function iataToCitySlug(iata: string): string | null {
  return IATA_TO_CITY[iata.trim().toUpperCase()] ?? null;
}

/**
 * Builds the real flyvia.de URL for a searched route.
 * Known city pair → /flights/from-to/{origin}-to-{destination}
 * otherwise       → homepage (hosts the full search form).
 */
export function buildFlyviaDeepLink(args: {
  origin: string;
  destination: string;
  departureDate?: string | null;
  returnDate?: string | null;
  passengers?: number;
  cabin?: string | null;
}): string {
  const from = iataToCitySlug(args.origin);
  const to = iataToCitySlug(args.destination);

  if (from && to && from !== to) {
    return `https://flyvia.de/flights/from-to/${from}-to-${to}`;
  }
  return "https://flyvia.de/";
}

/**
 * Repairs legacy booking URLs created by earlier versions of this
 * integration (the non-existent /flights/search?from=… route, which
 * shows flyvia.de's 404). Old messages saved in chat history carry
 * these URLs, so the UI sanitizes them before rendering.
 */
export function sanitizeFlyviaUrl(url: string | undefined | null, args?: {
  origin: string;
  destination: string;
  departureDate?: string | null;
  returnDate?: string | null;
  passengers?: number;
  cabin?: string | null;
}): string {
  if (url && /^https:\/\/(www\.)?flyvia\.de\/flights\/search\?/i.test(url)) {
    return args ? buildFlyviaDeepLink(args) : "https://flyvia.de/";
  }
  return url || (args ? buildFlyviaDeepLink(args) : "https://flyvia.de/");
}
