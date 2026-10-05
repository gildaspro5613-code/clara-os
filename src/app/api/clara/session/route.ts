// ============================================
// CLARA OS
// Core API
//
// File : route.ts
// Responsibility :
// Expose the current Clara runtime session.
// ============================================

import { NextResponse } from "next/server";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export async function GET() {
  const { session, acquisition } = await resolveOperationalContext();

  return NextResponse.json({
    state: session.state,
    recommendation: session.recommendation,
    mission: session.mission,
    brainDashboard: session.brainDashboard,
    acquisition,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  });
}
