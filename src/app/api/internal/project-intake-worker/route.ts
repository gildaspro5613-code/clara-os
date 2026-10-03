import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runProjectIntakeWorker } from "@/lib/intake/md-project-intake-worker";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, status: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await runProjectIntakeWorker();
    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[API /internal/project-intake-worker]", error);
    return NextResponse.json(
      { success: false, status: "worker_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
