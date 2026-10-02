import { NextResponse } from "next/server";
import { beginSignInTransaction } from "@/lib/auth/sign-in-transaction";
import { microsoftSignInAuthorizationUrl } from "@/lib/auth/microsoft-sign-in";

const NONCE_COOKIE = "clara_auth_microsoft_nonce";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transaction = await beginSignInTransaction("microsoft");
    const response = NextResponse.redirect(microsoftSignInAuthorizationUrl(transaction.state, transaction.nonce));
    response.cookies.set(NONCE_COOKIE, transaction.nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/microsoft/callback",
      maxAge: transaction.expiresIn,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[Clara auth Microsoft start]", error);
    return NextResponse.json({ success: false, message: "Connexion Clara indisponible." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
