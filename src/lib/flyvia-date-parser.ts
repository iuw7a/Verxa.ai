/**
 * Natural-language date parser for flight requests (EN + DE).
 * Kept framework-free and dependency-free so it can be unit-tested directly.
 */

const MONTHS: Record<string, number> = {
  jan: 0, januar: 0, january: 0,
  feb: 1, februar: 1, february: 1,
  mrz: 2, mär: 2, maerz: 2, mar: 2, march: 2,
  apr: 3, april: 3,
  mai: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  dez: 11, dezember: 11, dec: 11, december: 11,
};

const WEEKDAYS: [string, number][] = [
  ["sonntag|sunday", 0],
  ["montag|monday", 1],
  ["dienstag|tuesday", 2],
  ["mittwoch|wednesday", 3],
  ["donnerstag|thursday", 4],
  ["freitag|friday", 5],
  ["samstag|sonnabend|saturday", 6],
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m, d));
  if (dt.getUTCMonth() !== m || dt.getUTCDate() !== d) return null;
  return `${dt.getUTCFullYear()}-${pad(m + 1)}-${pad(d)}`;
}

function startOfToday(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Maps Arabic-Indic (١٢٣) and Eastern Persian (۱۲۳) digits to ASCII digits. */
function normalizeDigits(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function parseFlightDate(input: string, now: Date = new Date()): string | null {
  const text = normalizeDigits(input)
    .toLowerCase()
    // "١٠..٩" → "10.9": stray double dots collapse into one separator.
    .replace(/\.{2,}/g, ".");
  if (!text) return null;

  // 1) ISO: 2026-09-20
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return toIso(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  // 2) German numeric full: 20.09.2026 / 20.9.26
  const numFull = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
  if (numFull) {
    const yRaw = numFull[3];
    const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    return toIso(year, Number(numFull[2]) - 1, Number(numFull[1]));
  }

  // 3) German numeric short: 20.9.
  const numShort = text.match(/\b(\d{1,2})\.(\d{1,2})\.\s/);
  if (numShort) {
    return toIso(now.getFullYear(), Number(numShort[2]) - 1, Number(numShort[1]));
  }

  // 3b) Bare d.m: "10.9", "3.12" (day > month, e.g. Arabic "١٠..٩" → "10.9").
  // Slash form: "15/9", "10/9" — common chat shorthand (d/m convention).
  const bare = text.match(/\b(\d{1,2})[.\/](\d{1,2})\b/);
  if (bare) {
    let day = Number(bare[1]);
    let mon = Number(bare[2]) - 1;
    // If day/month is impossible (month > 12), swap to month/day.
    if (mon > 11 && day <= 12) {
      const t = day;
      day = mon + 1;
      mon = t - 1;
    }
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      let year = now.getFullYear();
      if (Date.UTC(year, mon, day) < startOfToday(now)) year += 1;
      return toIso(year, mon, day);
    }
  }

  // 4) Relative: today/heute, tomorrow/morgen
  if (/\b(heute|today)\b/.test(text)) {
    const y = now.getFullYear();
    return toIso(y, now.getMonth(), now.getDate());
  }
  if (/\b(morgen|tomorrow)\b/.test(text)) {
    const d = new Date(now.getTime() + 86400_000);
    return toIso(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 5) Weekday: next friday / nächsten freitag / am freitag / on friday
  for (const [names, dow] of WEEKDAYS) {
    const re = new RegExp(
      `\\b(?:next|nächsten|naechsten)?\\s*(?:am\\s+|on\\s+)?(?:dem\\s+)?(${names})\\b`,
      "i",
    );
    const m = text.match(re);
    if (m) {
      const target = dow;
      let diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // "on Friday" on a Friday → next week
      const d = new Date(now.getTime() + diff * 86400_000);
      return toIso(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  // 6) Month + day, both orders: "September 20", "20 September", "20. September"
  const monthNames = Object.keys(MONTHS).join("|");
  const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})\\.?\\s+(${monthNames})\\b`, "i"));
  const monthFirst = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\b`, "i"));
  const mDay = dayFirst ?? monthFirst;
  if (mDay) {
    const day = Number(dayFirst ? mDay[1] : mDay[2]);
    const mon = MONTHS[(dayFirst ? mDay[2] : mDay[1]).toLowerCase()];
    if (mon === undefined || Number.isNaN(day)) return null;
    let year = now.getFullYear();
    const candidate = Date.UTC(year, mon, day);
    if (candidate < startOfToday(now)) year += 1;
    return toIso(year, mon, day);
  }

  return null;
}
