/**
 * ============================================
 * CLARA OS
 * Documents API
 * --------------------------------------------
 * File : route.ts
 * Responsibility :
 * Exposes Google Drive documents to the
 * Documents workspace.
 * ============================================
 */

import { NextResponse } from "next/server";

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    const engine = new GoogleDriveEngine();

    const driveQuery = query
      ? `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`
      : "trashed = false";

    const result = await engine.list({
      pageSize: 50,
      query: driveQuery,
    });

    return NextResponse.json({
      success: true,
      query,
      files: result.files.map((file) => ({
        id: file.fileId,
        name: file.fileName,
        mimeType: file.mimeType,
        url: file.url,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de consulter Google Drive.",
      },
      { status: 500 },
    );
  }
}
