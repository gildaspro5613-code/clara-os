import { NextResponse } from "next/server";

/**
 * Physical action approval endpoint — intentionally fail-closed.
 *
 * No Clara OS authenticated user-session adapter exists yet. Until a trusted
 * server-side session can provide AuthenticatedOperator, this endpoint must
 * never manufacture identity from request headers/body/cookies and must never
 * authorize or execute an action.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "AUTHENTICATED_OPERATOR_UNAVAILABLE",
      error: "Physical action approval requires an authenticated Clara OS operator session.",
    },
    { status: 503 },
  );
}
