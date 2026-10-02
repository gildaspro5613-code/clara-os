import { NextResponse } from "next/server";
import { beginSignInTransaction } from "@/lib/auth/sign-in-transaction";
import { googleSignInAuthorizationUrl } from "@/lib/auth/google-sign-in";

const NONCE_COOKIE = "clara_auth_google_nonce";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transaction = await beginSignInTransaction("google");
    const response = NextResponse.redirect(googleSignInAuthorizationUrl(transaction.state, transaction.nonce));
    response.cookies.set(NONCE_COOKIE, transaction.nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      maxAge: transaction.expiresIn,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[Clara auth Google start]", error);
    return NextResponse.json({ success: false, message: "Connexion Clara indisponible." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
