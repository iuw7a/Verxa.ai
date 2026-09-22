import { NextRequest } from "next/server";
import {
  FlyviaError,
  buildFlyviaDeepLink,
  searchFlights,
  validateSearchArgs,
} from "@/lib/flyvia";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/tools/flyvia-search
 * Server-side proxy for the Flyvia flight search. The API key lives only in
 * server env; the client receives sanitized, normalized results.
 */
export async function POST(req: NextRequest) {
  // Optional auth: signed-in users only (matches the app's usage of the chat).
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return Response.json(
        { error: { code: "unauthorized", message: "Sign in to search flights." } },
        { status: 401 },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: { code: "invalid_request", message: "Body must be JSON." } },
      { status: 400 },
    );
  }

  try {
    const args = validateSearchArgs(body as never);
    const result = await searchFlights(args);
    return Response.json({
      search: {
        searchId: result.searchId,
        dataSource: result.dataSource,
        provider: result.provider,
        currency: result.currency,
        deepLink: buildFlyviaDeepLink(args),
        origin: args.origin,
        destination: args.destination,
        departureDate: args.departureDate,
        returnDate: args.returnDate ?? null,
        passengers: args.passengers ?? 1,
        cabin: args.cabin,
      },
      flights: result.flights,
    });
  } catch (error) {
    if (error instanceof FlyviaError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal", message: "Flight search failed." } },
      { status: 500 },
    );
  }
}
