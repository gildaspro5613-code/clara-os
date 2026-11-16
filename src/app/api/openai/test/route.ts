import { nativeOperationFence } from "@/lib/native/authority";
import { NextResponse } from "next/server";

/**
 * Legacy OpenAI smoke-test endpoint.
 *
 * Cost safety: production must never expose a GET route that can trigger a
 * billable model request. Keep the route as a non-billable diagnostic so old
 * bookmarks/monitors fail safely instead of consuming OpenAI credits.
 */
export async function GET(request: Request) {
  const nativeDenied=await nativeOperationFence(request);
  if(nativeDenied)return nativeDenied;

  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message: "OpenAI billable smoke test is disabled. Use an authenticated Clara workflow for model calls.",
    },
    { status: 410 },
  );
}
