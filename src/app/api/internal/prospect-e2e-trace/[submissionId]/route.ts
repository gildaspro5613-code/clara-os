import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { traceProspectE2E } from "@/lib/acquisition/prospect-e2e-trace";

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

function configuredWorkspaceId(): string {
  return process.env.CLARA_MD_WORKSPACE_ID?.trim() ||
    process.env.CLARA_WORKSPACE_ID?.trim() ||
    "melodie-digital";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, status: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { submissionId } = await context.params;
  const normalizedSubmissionId = submissionId.trim();
  if (!normalizedSubmissionId) {
    return NextResponse.json(
      { success: false, status: "invalid_submission_id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const trace = await traceProspectE2E(configuredWorkspaceId(), normalizedSubmissionId);
    return NextResponse.json(
      { success: true, trace },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[API /internal/prospect-e2e-trace/:submissionId]", error);
    return NextResponse.json(
      { success: false, status: "trace_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
