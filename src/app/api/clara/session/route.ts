// ============================================
// CLARA OS
// Core API
//
// File : route.ts
// Responsibility :
// Expose the current Clara runtime session.
// ============================================

import { NextResponse } from "next/server";
import { loadSession } from "@/lib/core/store/session-store";
import { getCurrentMission } from "@/modules/missions/current-mission";

export async function GET() {
  const [session, durableMission] = await Promise.all([
    loadSession(),
    getCurrentMission(),
  ]);

  return NextResponse.json({
    state: session.state,
    recommendation: session.recommendation,
    mission: durableMission ?? session.mission,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  });
}
