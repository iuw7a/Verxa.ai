// Quick verification of the Flyvia date parser (run: node scripts/test-flyvia-parser.mjs)
import { parseFlightDate } from "../src/lib/flyvia-date-parser.ts";

const now = new Date("2026-09-14T10:00:00Z");
const cases = [
  ["Find me a flight from Berlin to Istanbul on September 20", "2026-09-20"],
  ["Suche mir einen Flug am 20. September", "2026-09-20"],
  ["cheapest flight next Friday", "2026-09-18"],
  ["flight tomorrow", "2026-09-15"],
  ["flight on 2026-10-01", "2026-10-01"],
  ["21.03.2026 flug", "2026-03-21"],
  // Arabic-Indic digits from the real bug report: "١٠..٩" → 10.9.
  // Sep 10 is already past (now = Sep 14) → rolls to the next occurrence.
  ["شوفي حجزات من بيروت الى دبي بتاريخ ١٠..٩", "2027-09-10"],
  ["رحلة يوم ١٥/٩", "2026-09-15"],
  // Same digits, but the date is still ahead → same year.
  ["رحلة يوم ٢٠..٩", "2026-09-20"],
  ["no date here at all", null],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = parseFlightDate(input, now);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${input.padEnd(55)} → ${got}`);
}
process.exit(failed ? 1 : 0);
