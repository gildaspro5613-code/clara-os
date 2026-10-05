/**
 * ============================================
 * CLARA OS
 * Documents API
 * --------------------------------------------
 * Exposes the existing Google Drive document
 * capabilities to the Documents workspace.
 * ============================================
 */

import { NextResponse } from "next/server";

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";
import { googleReauthResponse } from "@/lib/connectors/google/auth/google-api-error-response";
import { dispatchEvent } from "@/lib/core/event-bus";
import { Clara } from "@/lib/core/clara";
import { getRuntime } from "@/lib/core/runtime";
import { resolveOperationalContext } from "@/lib/core/operational-context";
import { DEFAULT_SESSION_KEY } from "@/lib/core/store/session-store";
import { EventType } from "@/types";
import { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function failure(error: unknown, fallback: string) {
  const reauth = googleReauthResponse(error);
  if (reauth) return reauth;
  return NextResponse.json(
    {
      success: false,
      message: error instanceof Error ? error.message : fallback,
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const action = searchParams.get("action")?.trim() ?? "list";
    const fileId = searchParams.get("fileId")?.trim() ?? "";
    const fileName = searchParams.get("fileName")?.trim() ?? "";
    const mimeType = searchParams.get("mimeType")?.trim() || undefined;

    const engine = new GoogleDriveEngine();

    if (action === "read") {
      if (!fileId) {
        return NextResponse.json({ success: false, message: "fileId requis." }, { status: 400 });
      }

      const result = await engine.readContent({ fileId, fileName, mimeType });
      if (!result.textContent?.trim()) {
        return NextResponse.json({
          success: false,
          extractable: false,
          message: "Ce format ne fournit pas encore de texte extractible à Clara OS.",
        }, { status: 422 });
      }

      const operational = await resolveOperationalContext();
      const runtime = operational.sessionKey === DEFAULT_SESSION_KEY
        ? getRuntime()
        : new Clara(operational.sessionKey, operational.acquisition?.workspaceId);
      const session = await dispatchEvent(runtime, {
        id: crypto.randomUUID(),
        type: EventType.DOCUMENT_RECEIVED,
        source: "CLARA_DOCUMENTS",
        timestamp: new Date(),
        payload: {
          fileId,
          fileName,
          mimeType: result.mimeType ?? mimeType,
          textContent: result.textContent,
        },
        context: operational.acquisition
          ? {
              workspaceId: operational.acquisition.workspaceId,
              sessionId: operational.sessionKey,
              metadata: {
                acquisitionSubmissionId: operational.acquisition.submissionId,
              },
            }
          : undefined,
      });
      await new Journal().addEntry(writeActionEntry(
        `Document lu avec Clara · ${fileName || fileId}`,
        `Google Drive ${fileId} a produit un événement DOCUMENT_RECEIVED réel.`,
      ));

      return NextResponse.json({
        success: true,
        extractable: true,
        fileId,
        fileName,
        mimeType: result.mimeType ?? mimeType,
        textContent: result.textContent,
        brain: {
          recommendation: session.recommendation?.summary ?? null,
          missionId: session.mission?.id ?? null,
        },
      });
    }

    if (action === "download") {
      if (!fileId) {
        return NextResponse.json({ success: false, message: "fileId requis." }, { status: 400 });
      }

      const result = await engine.download({ fileId, fileName, mimeType });
      if (!(result.content instanceof Uint8Array)) {
        throw new Error("Le contenu téléchargé est indisponible.");
      }

      const body = new Blob([new Uint8Array(result.content)]);
      return new Response(body, {
        headers: {
          "Content-Type": result.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName || fileName || "document")}`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const driveQuery = query
      ? `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`
      : "trashed = false";

    const result = await engine.list({ pageSize: 50, query: driveQuery });

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
    return failure(error, "Impossible de consulter Google Drive.");
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const upload = formData.get("file");

    if (!(upload instanceof File)) {
      return NextResponse.json({ success: false, message: "Fichier requis." }, { status: 400 });
    }
    if (upload.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, message: "Fichier trop volumineux (20 Mo maximum)." }, { status: 413 });
    }

    const content = Buffer.from(await upload.arrayBuffer());
    const engine = new GoogleDriveEngine();
    const result = await engine.upload({
      fileName: upload.name,
      mimeType: upload.type || "application/octet-stream",
      content,
    });
    await new Journal().addEntry(writeActionEntry(
      `Document importé · ${upload.name}`,
      `Google Drive ${result.fileId}`,
    ));

    return NextResponse.json({
      success: true,
      file: {
        id: result.fileId,
        name: result.fileName,
        mimeType: upload.type || result.mimeType,
        url: result.url,
      },
    }, { status: 201 });
  } catch (error) {
    return failure(error, "Impossible d’importer le document dans Google Drive.");
  }
}
