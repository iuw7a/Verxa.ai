import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import { ADMIN_EMAILS } from "@/lib/admin";

function isCodeSubdomain(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  // prod + local + vercel previews (code-*.vercel.app / *-code-*.vercel.app)
  if (h === "code.verxa.de" || h === "code.localhost") return true;
  if (h.startsWith("code.")) return true;
  if (h.endsWith(".vercel.app") && h.split("-")[0] === "code") return true;
  return false;
}

/**
 * Email of the caller's Supabase cookie session — null when signed out (and
 * when auth is not configured at all). Middleware runs before any page
 * renders, so this is the earliest possible gate.
 */
async function sessionEmail(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

function isAdminEmail(email: string | null): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

/** Surfaces that need an account — guests get sent to /login with a return path. */
const MEMBER_PREFIXES = [
  "/chat",
  "/studio",
  "/account",
  "/projects",
  "/follow",
  "/plugins",
  "/search",
  "/api-keys",
  "/ai",
  "/mobile",
];

/** Public pages that live below a member prefix. */
const MEMBER_EXEMPT = ["/studio/coming-soon"];

/** Rewrites must keep the session cookies refreshed by updateSession(). */
function carrySessionCookies(target: NextResponse, source: NextResponse) {
  for (const c of source.cookies.getAll()) {
    target.cookies.set(c.name, c.value, { path: c.path });
  }
  return target;
}

export async function middleware(request: NextRequest) {
  // ---- Desktop-app CORS -------------------------------------------------
  // The installed desktop app loads its renderer from file:// (Origin: null)
  // and dev from http://localhost:5173 — both are cross-origin to verxa.de,
  // so browser fetches to /api/* fail preflight without these headers.
  // Browser (verxa.de) traffic is same-origin and unaffected. Desktop API
  // routes still enforce their own Bearer-token auth.
  const DESKTOP_ORIGINS = new Set([
    "null", // file:// renderer in the packaged app
    "http://localhost:5173", // vite dev server
    "http://127.0.0.1:5173",
  ]);
  const origin = request.headers.get("origin");
  const isDesktopApi =
    request.nextUrl.pathname.startsWith("/api/") &&
    (origin === null || DESKTOP_ORIGINS.has(origin));

  if (isDesktopApi && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin ?? "null",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const codeSubdomainRoot =
    isCodeSubdomain(request.headers.get("host")) && pathname === "/";
  const isCodeArea =
    codeSubdomainRoot || pathname === "/code" || pathname.startsWith("/code/");

  // ---- Verxa Code is admin-only -----------------------------------------
  // code.verxa.de and /code are the same Next.js app with the same Supabase
  // auth/cookies. Everyone who is not an admin is rewritten to the Coming
  // Soon screen — the gate runs before the page renders, so non-admins never
  // receive the dashboard bundle. /api/*, /login and /auth/* pass through.
  if (isCodeArea && !pathname.startsWith("/code/coming-soon")) {
    if (!isAdminEmail(await sessionEmail(request))) {
      const url = request.nextUrl.clone();
      url.pathname = "/code/coming-soon";
      url.search = "";
      return carrySessionCookies(
        NextResponse.rewrite(url, { request }),
        response,
      );
    }
    // Admins: the subdomain root resolves to the canonical /code dashboard.
    if (codeSubdomainRoot) {
      const url = request.nextUrl.clone();
      url.pathname = "/code";
      return carrySessionCookies(
        NextResponse.rewrite(url, { request }),
        response,
      );
    }
  }

  // ---- Members-only surfaces --------------------------------------------
  // Without an account Verxa stays marketing: /chat, /studio, /account … go to
  // the sign-in form with a return path instead of rendering the app shell.
  const needsMember =
    MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !MEMBER_EXEMPT.some((p) => pathname.startsWith(p));

  if (needsMember) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    // Fail open without Supabase config, so a bare local checkout stays usable.
    if (supabaseUrl && supabaseKey && !(await sessionEmail(request))) {
      const target = request.nextUrl.clone();
      target.pathname = "/login";
      target.search = `?next=${encodeURIComponent(
        `${pathname}${request.nextUrl.search}`,
      )}`;
      return carrySessionCookies(NextResponse.redirect(target), response);
    }
  }

  if (isDesktopApi) {
    response.headers.set("Access-Control-Allow-Origin", origin ?? "null");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Vary", "Origin");
  }

  // Server-side authorization: /mobile is admin-only. Runs before the page
  // renders, so non-admins never even receive the mobile app bundle.
  // Exception: /mobile/chat is the public invite sandbox — anyone with the
  // invite link may enter (member gate above still requires an account).
  if (
    request.nextUrl.pathname.startsWith("/mobile") &&
    request.nextUrl.pathname !== "/mobile/chat"
  ) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return response;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email ?? null;
    if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/chat";
      redirect.search = `?mobileDenied=${encodeURIComponent(email ?? "guest")}`;
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
