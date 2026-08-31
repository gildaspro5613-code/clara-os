import { NextResponse } from "next/server";
import { GoogleReauthRequiredError } from "./google-auth-error";

export function googleReauthResponse(error: unknown): NextResponse | null {
  if (!(error instanceof GoogleReauthRequiredError)) return null;
  return NextResponse.json(
    {
      success: false,
      code: error.code,
      message: error.message,
      reconnectUrl: "/api/connections/google/connect",
    },
    { status: 401 },
  );
}
