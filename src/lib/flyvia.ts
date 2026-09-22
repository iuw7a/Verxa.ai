import "server-only";
import { parseFlightDate } from "@/lib/flyvia-date-parser";
import { buildFlyviaDeepLink as buildFlyviaDeepLinkVerified } from "@/lib/flyvia-link";

/**
 * Flyvia API client — server-side only.
 *
 * Real API (https://flyvia.de/developers):
 *   POST {base}/flights/search
 *   Auth: Authorization: Bearer $FLYVIA_API_KEY
 *   Body: { origin, destination, departureDate, returnDate?, passengers?, cabin? }
 *   200 → { success, data: { searchId, dataSource, provider, currency, count,
 *                             flights: [ { id, providerId, businessModel,
 *                                          price: { currency, total, perTraveler },
 *                                          outbound: Segment[], inbound?: Segment[] } ] } }
 *   Errors: 401 invalid key · 403 permission · 422 validation · 429 rate limit · 503 provider
 *
 * The key never leaves the server; nothing here is imported by client code.
 */

const DEFAULT_BASE = "https://flyvia.de/api/v1";
const TIMEOUT_MS = 25_000;

export type FlyviaSegment = {
  id: string;
  airline: { code: string; name: string; logoUrl?: string };
  flightNumber: string;
  origin: { iata: string; name?: string; city?: string; country?: string };
  destination: { iata: string; name?: string; city?: string; country?: string };
  departAt: string;
  arriveAt: string;
  durationMinutes?: number;
  aircraft?: string;
  cabinClass?: string;
};

export type FlyviaFlight = {
  id: string;
  providerId?: string;
  businessModel?: string;
  price: { currency: string; total: number; perTraveler?: { travelerId: string; total: number }[] };
  outbound: FlyviaSegment[];
  inbound?: FlyviaSegment[];
};

export type FlyviaSearchArgs = {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string | null;
  passengers?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
};

export type FlyviaSearchResult = {
  searchId: string;
  dataSource: string;
  provider: string;
  currency: string;
  flights: FlyviaFlight[];
};

export class FlyviaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "FlyviaError";
  }
}

const IATA_RE = /^[A-Za-z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CABINS = new Set(["economy", "premium_economy", "business", "first"]);

/** Validates + normalizes user/AI-supplied search input. Throws FlyviaError(422). */
export function validateSearchArgs(raw: Partial<FlyviaSearchArgs>): FlyviaSearchArgs {
  const origin = String(raw.origin ?? "").trim().toUpperCase();
  const destination = String(raw.destination ?? "").trim().toUpperCase();
  const departureDate = String(raw.departureDate ?? "").trim();
  const returnDate = raw.returnDate ? String(raw.returnDate).trim() : null;

  if (!IATA_RE.test(origin)) {
    throw new FlyviaError("Origin must be a 3-letter IATA code (e.g. BER).", 422, "invalid_origin");
  }
  if (!IATA_RE.test(destination)) {
    throw new FlyviaError("Destination must be a 3-letter IATA code (e.g. IST).", 422, "invalid_destination");
  }
  if (origin === destination) {
    throw new FlyviaError("Origin and destination must differ.", 422, "same_airports");
  }
  if (!DATE_RE.test(departureDate) || Number.isNaN(Date.parse(departureDate))) {
    throw new FlyviaError("Departure date must be YYYY-MM-DD.", 422, "invalid_date");
  }
  if (returnDate && (!DATE_RE.test(returnDate) || Number.isNaN(Date.parse(returnDate)))) {
    throw new FlyviaError("Return date must be YYYY-MM-DD.", 422, "invalid_return_date");
  }
  if (returnDate && returnDate < departureDate) {
    throw new FlyviaError("Return date must be on or after the departure date.", 422, "return_before_departure");
  }

  const passengers = Math.min(Math.max(Math.floor(Number(raw.passengers ?? 1)) || 1, 1), 9);
  const cabinInput = String(raw.cabin ?? "economy").toLowerCase().replace(/[\s-]/g, "_");
  const cabin = (CABINS.has(cabinInput) ? cabinInput : "economy") as FlyviaSearchArgs["cabin"];

  return { origin, destination, departureDate, returnDate, passengers, cabin };
}

/**
 * Builds a real flyvia.de deep link for continuing the booking on-site.
 * Delegates to the client-safe builder (verified real URL structure —
 * /flights/from-to/{city}-to-{city}; the old /flights/search?… route 404s).
 */
export function buildFlyviaDeepLink(args: FlyviaSearchArgs): string {
  return buildFlyviaDeepLinkVerified({
    origin: args.origin,
    destination: args.destination,
    departureDate: args.departureDate,
    returnDate: args.returnDate,
    passengers: args.passengers,
    cabin: args.cabin,
  });
}

type RawResponse = {
  success?: boolean;
  data?: {
    searchId?: string;
    dataSource?: string;
    provider?: string;
    currency?: string;
    count?: number;
    flights?: unknown;
  };
  error?: { code?: string; message?: string };
};

/** Defensive validation of the upstream response before anything is rendered. */
function parseSearchResponse(json: RawResponse): FlyviaSearchResult {
  if (!json || typeof json !== "object") {
    throw new FlyviaError("Unexpected Flyvia response shape.", 502, "bad_response");
  }
  if (json.error) {
    throw new FlyviaError(
      json.error.message ?? "Flyvia request failed.",
      502,
      json.error.code ?? "upstream_error",
    );
  }
  const data = json.data;
  const flights = data?.flights;
  if (!data || !Array.isArray(flights)) {
    throw new FlyviaError("Flyvia returned no flight list.", 502, "bad_response");
  }

  const clean: FlyviaFlight[] = [];
  for (const f of flights) {
    try {
      const flight = f as FlyviaFlight;
      if (!flight?.id || typeof flight.price?.total !== "number") continue;
      if (!Array.isArray(flight.outbound) || flight.outbound.length === 0) continue;
      // Validate segments minimally: IATA codes + timestamps must exist.
      const okSeg = (s: FlyviaSegment) =>
        Boolean(s?.origin?.iata && s?.destination?.iata && s?.departAt && s?.arriveAt);
      if (!flight.outbound.every(okSeg)) continue;
      if (flight.inbound && !flight.inbound.every(okSeg)) continue;
      clean.push(flight);
    } catch {
      /* skip malformed entries */
    }
  }

  return {
    searchId: String(data.searchId ?? ""),
    dataSource: String(data.dataSource ?? "unknown"),
    provider: String(data.provider ?? "Flyvia"),
    currency: String(data.currency ?? flightCurrency(flights) ?? "EUR"),
    flights: clean,
  };
}

function flightCurrency(flights: unknown): string | null {
  const first = (flights as FlyviaFlight[] | undefined)?.[0];
  return first?.price?.currency ?? null;
}

/* ------------------------------------------------------------------ */
/* Detection + extraction (server-side AI tool: flyvia_search_flights) */
/* ------------------------------------------------------------------ */

/** City name → best-guess IATA code (covers common Verxa user cities). */
const CITY_CODES: Record<string, string> = {
  berlin: "BER", munich: "MUC", münchen: "MUC", hamburg: "HAM", frankfurt: "FRA",
  cologne: "CGN", stuttgart: "STR", düsseldorf: "DUS", duesseldorf: "DUS",
  amsterdam: "AMS", paris: "CDG", london: "LHR", istanbul: "IST", ankara: "ESB",
  dubai: "DXB", abu_dhabi: "AUH", new_york: "JFK", los_angeles: "LAX",
  lisbon: "LIS", porto: "OPO", barcelona: "BCN", madrid: "MAD", rome: "FCO",
  milan: "MXP", vienna: "VIE", zurich: "ZRH", bangkok: "BKK", tokyo: "HND",
  prague: "PRG", warsaw: "WAW", viyana: "VIE", cairo: "CAI", beirut: "BEY",
  damascus: "DAM", amman: "AMM", doha: "DOH", delhi: "DEL", singapore: "SIN",
  hong_kong: "HKG", sydney: "SYD", "new york": "JFK", "los angeles": "LAX",
};

function toIata(value: string): string | null {
  return cityNameToIata(value);
}

/**
 * Maps a city name (any casing, spaces or underscores) to a best-guess IATA
 * code. Exported for the LLM-extraction fallback in the chat route.
 */
export function cityNameToIata(value: string): string | null {
  const v = value.trim();
  if (IATA_RE.test(v)) return v.toUpperCase();
  return CITY_CODES[v.toLowerCase().replace(/\s+/g, "_")] ?? null;
}

export type FlyviaDetection = {
  /** Extracted/known parameters (partial — may miss origin, destination, date). */
  params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    passengers?: number;
    cabin?: string;
  };
};

const CABIN_WORDS: Record<string, string> = {
  economy: "economy", economy_class: "economy", business: "business",
  business_class: "business", first: "first", first_class: "first",
  premium: "premium_economy", premium_economy: "premium_economy",
};

/**
 * Detects a Flyvia flight-search request in the recent conversation and
 * extracts search parameters (EN + DE). Looks at the last user message and,
 * for follow-ups like "only direct flights", falls back to prior flights
 * context carried by the client.
 */
export function detectFlyviaRequest(
  messages: { role: string; content: string }[],
): FlyviaDetection | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;
  const text = lastUser.content;

  // Trigger: explicit @Flyvia / flyvia mention OR clear flight-search intent.
  const explicit = /@?flyvia/i.test(text);
  const flightIntent =
    /\b(flight|flights|flug|flüge|fluege|fly|search flights|find me a flight)\b/i.test(text);
  if (!explicit && !flightIntent) return null;

  const params: FlyviaDetection["params"] = {};

  // Route: "from X to Y" / "von X nach Y" / "X to Y"
  const routeRe = [
    /\bfrom\s+([A-Za-zäöüß .\-]{2,40}?)\s+to\s+([A-Za-zäöüß .\-]{2,40}?)(?:\s+(?:on|at|am|for|next|tomorrow|today|[\d])|[?!,.]|$)/i,
    /\bvon\s+([A-Za-zäöüß .\-]{2,40}?)\s+(?:nach|zu)\s+([A-Za-zäöüß .\-]{2,40}?)(?:\s+(?:am|für|for|next|tomorrow|today|[\d])|[?!,.]|$)/i,
  ];
  for (const re of routeRe) {
    const m = text.match(re);
    if (m) {
      const origin = toIata(m[1]);
      const destination = toIata(m[2]);
      if (origin) params.origin = origin;
      if (destination) params.destination = destination;
      break;
    }
  }

  // Dates
  const departureDate = parseFlightDate(text);
  if (departureDate) params.departureDate = departureDate;
  const returnMatch = text.match(/\b(?:return(?:ing)?|zurück|rückflug)(?:\s+(?:on|am))?\s+([^,.;\n]{3,40})/i);
  if (returnMatch) {
    const ret = parseFlightDate(returnMatch[1]);
    if (ret) params.returnDate = ret;
  }

  // Passengers
  const pax = text.match(/\b(\d{1,2})\s*(?:passengers?|persons?|people|reisende|personen|pax)\b/i);
  if (pax) params.passengers = Math.min(Math.max(Number(pax[1]), 1), 9);
  const pax2 = text.match(/\bfor\s+(\d{1,2})\b/i);
  if (!params.passengers && pax2) params.passengers = Math.min(Math.max(Number(pax2[1]), 1), 9);

  // Cabin
  for (const [word, cabin] of Object.entries(CABIN_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      params.cabin = cabin;
      break;
    }
  }

  return { params };
}

/**
 * Searches real flights via the Flyvia API.
 * Every request carries the server-only key with a hard timeout.
 */
export async function searchFlights(args: FlyviaSearchArgs): Promise<FlyviaSearchResult> {
  const apiKey = process.env.FLYVIA_API_KEY;
  if (!apiKey) {
    throw new FlyviaError("Flyvia is not configured on the server.", 500, "not_configured");
  }
  const base = (process.env.FLYVIA_API_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/flights/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: args.origin,
        destination: args.destination,
        departureDate: args.departureDate,
        returnDate: args.returnDate ?? null,
        passengers: args.passengers ?? 1,
        cabin: args.cabin ?? "economy",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      const code =
        res.status === 401
          ? "flyvia_auth"
          : res.status === 403
            ? "flyvia_permission"
            : res.status === 422
              ? "flyvia_validation"
              : res.status === 429
                ? "flyvia_rate_limited"
                : "flyvia_unavailable";
      // Never include the key in any message.
      throw new FlyviaError(
        `Flyvia search failed (HTTP ${res.status}).${text && res.status >= 500 ? "" : ""}`,
        res.status >= 500 ? 502 : res.status,
        code,
      );
    }

    const json = (await res.json()) as RawResponse;
    return parseSearchResponse(json);
  } catch (error) {
    if (error instanceof FlyviaError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new FlyviaError("Flyvia search timed out. Try again in a moment.", 504, "timeout");
    }
    throw new FlyviaError("Could not reach Flyvia.", 502, "network_error");
  } finally {
    clearTimeout(timer);
  }
}
