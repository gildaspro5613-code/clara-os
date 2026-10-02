import { NextResponse, type NextRequest } from "next/server";
import { authenticatedSessionCookie } from "@/lib/auth/authenticated-session-lifecycle";
import { completeMicrosoftSignIn } from "@/lib/auth/microsoft-sign-in";
import { isOpaqueAuthValue } from "@/lib/auth/sign-in-transaction";

const NONCE_COOKIE = "clara_auth_microsoft_nonce";
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
    path: "/api/auth/microsoft/callback",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
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
    const token = await completeMicrosoftSignIn(code, state, nonce);
    const response = finish(origin, "connected");
    const session = authenticatedSessionCookie(token, process.env.NODE_ENV === "production");
    response.cookies.set(session.name, session.value, session.options);
    return response;
  } catch (error) {
    console.error("[Clara auth Microsoft callback]", error);
    return finish(origin, "sign_in_failed");
  }
}
