import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login", "/resetpass", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) {
    return NextResponse.next();
  }

  // getSessionCookie samo preveri PRISOTNOST cookieja (hitro, brez DB klica) -
  // primerno za middleware. Pravo validacijo naredi auth.api.getSession
  // v server komponentah/API routes, kjer je dostop do DB smiseln.
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Ujemi vse poti razen:
     * - _next/static, _next/image (Next.js interni asseti)
     * - favicon.ico
     * - datotek s končnico (slike, itd.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
