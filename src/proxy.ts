/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : proxy.ts
 * Responsibility : Locale resolution proxy (Next.js 16).
 * Reads the NEXT_LOCALE cookie; if absent, detects the preferred
 * locale from the Accept-Language header and sets the cookie so
 * that subsequent requests resolve the correct messages.
 * No URL rewriting — locale is conveyed via cookie only.
 * ============================================
 */

import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Already has a locale cookie — nothing to do.
  if (request.cookies.has(LOCALE_COOKIE)) {
    return response;
  }

  // Detect preferred locale from Accept-Language header.
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().substring(0, 2))
    .find(Boolean);

  const locale = resolveLocale(preferred ?? null);

  // Persist for subsequent requests (session cookie, no expiry).
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/" });

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static assets.
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
