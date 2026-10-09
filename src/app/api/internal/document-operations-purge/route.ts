import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeDocumentOperations } from "@/lib/maintenance/document-operations-purge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // Same private maintenance credential as existing internal OS routes. Cookies,
  // external product credentials, query parameters and User-Agent grant nothing.
  const secret = process.env.CRON_SECRET?.trim();
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(secret ? `Bearer ${secret}` : "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ success: false, status: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const started = performance.now();
  const runId = randomUUID();
  try {
    const cleared = await purgeDocumentOperations();
    console.info("Document operation purge", JSON.stringify({ run_id: runId,
      status: "completed", expired_results_cleared: cleared,
      duration_ms: Math.round(performance.now() - started) }));
    return NextResponse.json({ success: true, expired_results_cleared: cleared },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Never serialize the database error, SQL, headers, scope or document result.
    console.warn("Document operation purge", JSON.stringify({ run_id: runId,
      status: "failed", duration_ms: Math.round(performance.now() - started) }));
    return NextResponse.json({ success: false, status: "purge_failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
