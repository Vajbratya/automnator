import { NextResponse, type NextRequest } from "next/server";

import { CSRF_COOKIE, CSRF_HEADER, isCsrfValid, newCsrfToken } from "@/lib/csrf";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/ai(\/|$)/,
  /^\/api\/health(\/|$)/,
  /^\/api\/worker\/run(\/|$)/,
  /^\/api\/auto\/run(\/|$)/,
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect authenticated app routes.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  // Ensure a CSRF token cookie exists for browser requests.
  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!csrfCookie) {
    response.cookies.set(CSRF_COOKIE, newCsrfToken(), {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: request.nextUrl.protocol === "https:",
    });
  }

  // Enforce CSRF for state-changing API routes (except exempt paths).
  if (pathname.startsWith("/api/") && STATE_CHANGING_METHODS.has(request.method)) {
    if (!CSRF_EXEMPT.some((re) => re.test(pathname))) {
      const cookieValue = csrfCookie;
      const headerValue = request.headers.get(CSRF_HEADER);
      if (!isCsrfValid(cookieValue, headerValue)) {
        return NextResponse.json(
          { error: "CSRF token missing or invalid." },
          { status: 403 }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
