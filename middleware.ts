import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session";

const PUBLIC_PATHS = new Set<string>([
  "/", // home
  "/login", // login
  "/signup", // signup
]);

function sanitizeNext(value: string | null): string | null {
  if (!value) return null;
  // Only allow relative paths to prevent open redirects.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public pages.
  if (PUBLIC_PATHS.has(pathname)) {
    // Optional UX: if already authenticated and user visits /start, send them away.
    if (pathname === "/login") {
      const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (session) {
        const nextParam = sanitizeNext(request.nextUrl.searchParams.get("next"));
        const url = request.nextUrl.clone();
        url.pathname = nextParam ?? "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Require auth for everything else matched by config.
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on all pages except Next internals and API routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
