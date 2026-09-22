"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  Loader2,
  PlaneTakeoff,
} from "lucide-react";
import type { FlightsAttachment, FlightSegment } from "@/lib/types";
import { sanitizeFlyviaUrl } from "@/lib/flyvia-link";
import { cn } from "@/lib/utils";

const INITIAL_COUNT = 5;

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtDuration(min?: number) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

function cabinLabel(cabin?: string) {
  if (!cabin) return null;
  const map: Record<string, string> = {
    ECONOMY: "Economy",
    economy: "Economy",
    PREMIUM_ECONOMY: "Premium Eco",
    premium_economy: "Premium Eco",
    BUSINESS: "Business",
    business: "Business",
    FIRST: "First",
    first: "First",
  };
  return map[cabin] ?? null;
}

function routeOf(segments: FlightSegment[]) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  return { first, last, stops: Math.max(0, segments.length - 1) };
}

function LegRow({
  segments,
  glass,
}: {
  segments: FlightSegment[];
  glass: boolean;
}) {
  const { first, last, stops } = routeOf(segments);
  const duration = segments.reduce((n, s) => n + (s.durationMinutes ?? 0), 0);
  const airlines = [...new Set(segments.map((s) => s.airlineName))];
  const logo = segments[0]?.airlineLogo;

  return (
    <div className="flex items-center gap-3">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={26}
          height={26}
          loading="lazy"
          className="h-[26px] w-[26px] shrink-0 rounded-[6px] object-contain"
        />
      ) : (
        <span className={cn("flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px]", glass ? "bg-white/[0.07]" : "bg-white/[0.05]")}>
          <PlaneTakeoff size={13} className="text-faint" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-ink">{fmtTime(first.departAt)}</span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-faint">
            <span className="text-[10.5px]">{first.fromIata}</span>
            <span className="relative flex-1">
              <span className="block h-px w-full bg-white/15" />
              {stops > 0 ? (
                <span className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
              ) : null}
            </span>
            <ArrowRight size={11} className="shrink-0" />
          </span>
          <span className="text-[15px] font-medium text-ink">{fmtTime(last.arriveAt)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-faint">
          <span className="truncate">
            {airlines.join(" · ")} · {first.flightNumber}
            {segments.length > 1 ? ` → … → ${last.flightNumber}` : ""}
          </span>
          {duration > 0 ? <span>{fmtDuration(duration)}</span> : null}
          <span className={stops === 0 ? "text-ok" : undefined}>
            {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  index,
  glass,
  fallbackUrl,
}: {
  offer: FlightsAttachment["offers"][number];
  index: number;
  glass: boolean;
  fallbackUrl: string;
}) {
  const out = routeOf(offer.outbound);
  const ret = offer.inbound?.length ? routeOf(offer.inbound) : null;
  const cabin = cabinLabel(offer.outbound[0]?.cabinClass ?? offer.inbound?.[0]?.cabinClass);
  const anim = glass ? "animate-lx-rise" : "animate-rise";
  const bookingUrl = sanitizeFlyviaUrl(offer.bookingUrl || fallbackUrl, {
    origin: offer.outbound[0]?.fromIata ?? "",
    destination: offer.outbound[0]?.toIata ?? "",
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] transition-transform duration-200",
        glass
          ? "glass glass-btn"
          : "rounded-[16px] border border-line bg-bg-elevated/70",
        anim,
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      {/* Route header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
          <span className="font-medium text-ink">{out.first.fromIata}</span>
          <span className="flex flex-col items-center text-faint">
            <ArrowRight size={12} />
          </span>
          <span className="font-medium text-ink">{out.last.toIata}</span>
          <span className="ml-1 truncate text-[11.5px] text-faint">
            {fmtDate(offer.outbound[0]?.departAt?.slice(0, 10) ?? "")}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {offer.currency === "EUR" ? "€" : offer.currency}
            {offer.price}
          </span>
        </div>
      </div>

      {/* Legs */}
      <div className="space-y-2.5 px-4 pb-3">
        <LegRow segments={offer.outbound} glass={glass} />
        {ret ? (
          <div className="flex items-center gap-2 text-[10.5px] tracking-wide text-faint uppercase">
            <span className="h-px flex-1 bg-white/[0.07]" />
            Return
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
        ) : null}
        {ret ? <LegRow segments={offer.inbound!} glass={glass} /> : null}
      </div>

      {/* Meta + CTA */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5",
          glass ? "border-t border-white/[0.07]" : "border-t border-line",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-faint">
          {cabin ? <span>{cabin}</span> : null}
          {offer.outbound[0]?.aircraft ? (
            <span className="hidden truncate sm:inline">{offer.outbound[0].aircraft}</span>
          ) : null}
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "tab-item flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition",
            glass ? "glass-cta" : "bg-accent text-[#0b0b10] hover:bg-accent-strong",
          )}
        >
          <ExternalLink size={12.5} />
          View on Flyvia
        </a>
      </div>
    </div>
  );
}

export function FlightSearching({ glass = false }: { glass?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[18px] px-4 py-3.5",
        glass ? "glass" : "border border-line bg-bg-elevated/60",
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={16} className="animate-spin text-accent" />
      <span className="text-[13.5px] text-muted">Searching Flyvia for the best flights…</span>
    </div>
  );
}

export function FlightCards({
  flights,
  glass = false,
}: {
  flights: FlightsAttachment;
  glass?: boolean;
}) {
  const [visible, setVisible] = useState(INITIAL_COUNT);
  const shown = useMemo(() => flights.offers.slice(0, visible), [flights.offers, visible]);

  if (!flights.offers.length) return null;

  return (
    <div className="mt-1 w-full">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-medium tracking-[0.12em] text-faint uppercase">
          {flights.origin} → {flights.destination} ·{" "}
          {fmtDate(flights.departureDate)}
          {flights.returnDate ? ` · ${fmtDate(flights.returnDate)}` : ""} ·{" "}
          {flights.passengers} pax
        </p>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px] text-faint",
            flights.dataSource === "live" && "text-ok",
          )}
        >
          <Briefcase size={10.5} />
          {flights.dataSource === "live" ? "Live via Flyvia" : flights.provider}
        </span>
      </div>

      <div className="space-y-2.5">
        {shown.map((offer, i) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            index={i}
            glass={glass}
            fallbackUrl={sanitizeFlyviaUrl(flights.offers[0]?.bookingUrl, {
              origin: flights.origin,
              destination: flights.destination,
              departureDate: flights.departureDate,
              returnDate: flights.returnDate,
              passengers: flights.passengers,
              cabin: flights.cabin,
            })}
          />
        ))}
      </div>

      {flights.offers.length > visible ? (
        <button
          onClick={() => setVisible((v) => v + 5)}
          className={cn(
            "tab-item mt-2.5 w-full rounded-[14px] py-2.5 text-[13px] font-medium text-muted transition hover:text-ink",
            glass ? "glass-btn" : "border border-line bg-white/[0.02]",
          )}
        >
          Show {Math.min(5, flights.offers.length - visible)} more of{" "}
          {flights.offers.length} flights
        </button>
      ) : null}

      <p className="mt-2 px-0.5 text-[11px] text-faint">
        Prices found via Flyvia — booking completes on flyvia.de.
      </p>
    </div>
  );
}
