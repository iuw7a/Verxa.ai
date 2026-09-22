import { type NextRequest } from "next/server";
import { denyDesktopAuth } from "@/lib/desktop-auth";

export const runtime = "nodejs";

/** POST /api/desktop/auth/deny — signed-in user rejects the pairing. */
export async function POST(req: NextRequest) {
  return denyDesktopAuth(req);
}
