import { NextResponse, type NextRequest } from "next/server";
import { authenticatedSessionCookie } from "@/lib/auth/authenticated-session-lifecycle";
import { completeGoogleSignIn } from "@/lib/auth/google-sign-in";
import { isOpaqueAuthValue } from "@/lib/auth/sign-in-transaction";
import { enrollmentCookie } from "@/lib/auth/recette-google-enrollment";

const NONCE_COOKIE = "clara_auth_google_nonce";
export const dynamic = "force-dynamic";

function appOrigin(): string | null {
  const configured = process.env.CLARA_AUTH_APP_ORIGIN?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function finish(origin: string, status: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?auth=${encodeURIComponent(status)}`, origin));
  response.cookies.set(NONCE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(enrollmentCookie, "", {httpOnly:true,secure:true,sameSite:"strict",path:"/api/auth/google/callback",maxAge:0});
  return response;
}

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  if (!origin) {
    return NextResponse.json({ success: false, message: "Origine Clara non configurée." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("error")) return finish(origin, "access_denied");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const nonce = request.cookies.get(NONCE_COOKIE)?.value ?? "";
  if (!isOpaqueAuthValue(state) || !isOpaqueAuthValue(nonce) || !code.trim()) return finish(origin, "invalid_callback");

  try {
    // Verification order is deliberate: signature/issuer/audience/expiry/nonce,
    // then atomic state+nonce consumption, then enrollment/session issuance.
    const ticket = request.cookies.get(enrollmentCookie)?.value;
    const token = await completeGoogleSignIn(code, state, nonce, ticket);
    const response = finish(origin, "connected");
    const session = authenticatedSessionCookie(token, process.env.NODE_ENV === "production");
    response.cookies.set(session.name, session.value, session.options);
    return response;
  } catch (error) {
    // Enrollment errors may originate from a database driver; never log its
    // detail/query/parameters or a Google subject.
    void error;
    console.error("[Clara auth Google callback]", "SIGN_IN_REFUSED");
    return finish(origin, "sign_in_failed");
  }
}
