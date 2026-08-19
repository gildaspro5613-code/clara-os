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

export async function GET() {
  const session = await loadSession();

  return NextResponse.json({
    state: session.state,
    recommendation: session.recommendation,
    mission: session.mission,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  });
}
