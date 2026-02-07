import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public pages.
  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login") {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token) {
        console.log("[middleware]", { hasToken: Boolean(token) })
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
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[middleware]", {
      path: `${pathname}${search}`,
      hasToken: Boolean(token),
    });
  }

  if (token) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on all pages except Next internals and API routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
