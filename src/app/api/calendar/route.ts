import { NextRequest, NextResponse } from "next/server";

import { listEvents } from "@/lib/connectors/google/calendar/list-events";
import { runWithGoogleRuntimeToken } from "@/lib/connectors/internal/google/auth/google-runtime-token-context";
import { resolveOrganizationSession } from "@/lib/security/organization-session";
import { getGoogleWorkspaceTokenForUser } from "@/lib/security/vercel-connect-google";

export async function GET(request: NextRequest) {
  const session = resolveOrganizationSession(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        events: [],
        code: "CLARA_SESSION_REQUIRED",
        message: "Session Clara requise.",
      },
      { status: 401 },
    );
  }

  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const accessToken = await getGoogleWorkspaceTokenForUser(session.userId);

    const result = await runWithGoogleRuntimeToken(
      {
        organizationId: session.organizationId,
        accessToken,
      },
      () =>
        listEvents({
          calendarId: "primary",
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          pageSize: 10,
          singleEvents: true,
          orderBy: "startTime",
        }),
    );

    return NextResponse.json({
      success: true,
      events: result.events,
      nextPageToken: result.nextPageToken ?? null,
    });
  } catch (error) {
    console.error("[API /calendar]", error);

    const message = error instanceof Error ? error.message : "Impossible de récupérer l'agenda.";
    const authorizationRequired =
      error instanceof Error &&
      (error.name === "UserAuthorizationRequiredError" ||
        /authorization|required|consent/i.test(error.message));

    return NextResponse.json(
      {
        success: false,
        events: [],
        code: authorizationRequired
          ? "GOOGLE_AUTHORIZATION_REQUIRED"
          : "GOOGLE_CALENDAR_UNAVAILABLE",
        message: authorizationRequired
          ? "Connexion Google requise."
          : message,
      },
      { status: authorizationRequired ? 401 : 500 },
    );
  }
}
