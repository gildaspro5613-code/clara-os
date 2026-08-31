import { NextResponse } from "next/server";
import { listEvents } from "@/lib/connectors/google/calendar/list-events";
import { googleReauthResponse } from "@/lib/connectors/google/auth/google-api-error-response";

export async function GET() {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await listEvents({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      pageSize: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({
      success: true,
      events: result.events,
      nextPageToken: result.nextPageToken ?? null,
    });
  } catch (error) {
    const reauth = googleReauthResponse(error);
    if (reauth) return reauth;
    console.error("[API /calendar]", error);

    return NextResponse.json(
      {
        success: false,
        events: [],
        message:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer l'agenda.",
      },
      { status: 500 },
    );
  }
}
