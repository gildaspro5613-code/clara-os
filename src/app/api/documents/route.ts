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
import { DriveClient } from "@/lib/connectors/internal/google/drive/drive-client";
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
    const folderId = searchParams.get("folderId")?.trim() ?? "";
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

    const escapeDrive = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    const driveQuery = [
      "trashed = false",
      query ? `name contains '${escapeDrive(query)}'` : folderId ? `'${escapeDrive(folderId)}' in parents` : "'root' in parents",
    ].join(" and ");

    const result = await engine.list({ pageSize: 50, query: driveQuery });

    return NextResponse.json({
      success: true,
      query,
      files: result.files.map((file) => ({
        id: file.fileId,
        name: file.fileName,
        mimeType: file.mimeType,
        url: file.url,
        parentId: file.parents?.[0] ?? null,
      })),
    });
  } catch (error) {
    return failure(error, "Impossible de consulter Google Drive.");
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as { action?: string; fileId?: string; destinationId?: string; name?: string; parentId?: string };
      const drive = await new DriveClient().create();
      if (body.action === "createFolder") {
        const name = body.name?.trim();
        if (!name || name.length > 150) return NextResponse.json({ success: false, message: "Nom de dossier invalide." }, { status: 400 });
        if (body.parentId) {
          const parent = await drive.files.get({ fileId: body.parentId, fields: "id,mimeType", supportsAllDrives: true });
          if (parent.data.mimeType !== "application/vnd.google-apps.folder") {
            return NextResponse.json({ success: false, message: "Le parent doit être un dossier Google Drive." }, { status: 400 });
          }
        }
        const created = await drive.files.create({
          requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: body.parentId ? [body.parentId] : undefined },
          fields: "id,name", supportsAllDrives: true,
        });
        return NextResponse.json({ success: true, folder: { id: created.data.id, name: created.data.name } });
      }
      if (body.action === "move") {
        if (!body.fileId || !body.destinationId || body.fileId === body.destinationId) {
          return NextResponse.json({ success: false, message: "Déplacement invalide." }, { status: 400 });
        }
        const [source, destination] = await Promise.all([
          drive.files.get({ fileId: body.fileId, fields: "id,name,parents,mimeType", supportsAllDrives: true }),
          drive.files.get({ fileId: body.destinationId, fields: "id,mimeType", supportsAllDrives: true }),
        ]);
        if (destination.data.mimeType !== "application/vnd.google-apps.folder") {
          return NextResponse.json({ success: false, message: "La destination doit être un dossier." }, { status: 400 });
        }
        if (source.data.mimeType === "application/vnd.google-apps.folder") {
          return NextResponse.json({ success: false, message: "Le déplacement de dossiers n'est pas encore autorisé." }, { status: 400 });
        }
        if (!source.data.parents?.length) {
          return NextResponse.json({ success: false, message: "Impossible de déplacer un fichier sans dossier parent connu." }, { status: 409 });
        }
        if (source.data.parents.includes(body.destinationId)) {
          return NextResponse.json({ success: false, message: "Ce fichier se trouve déjà dans le dossier choisi." }, { status: 409 });
        }
        await drive.files.update({
          fileId: body.fileId, addParents: body.destinationId,
          removeParents: (source.data.parents ?? []).join(","),
          requestBody: {}, fields: "id,name,parents", supportsAllDrives: true,
        });
        await new Journal().addEntry(writeActionEntry(
          `Document déplacé · ${source.data.name ?? body.fileId}`,
          `Google Drive : déplacement confirmé vers ${body.destinationId}.`,
        ));
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: "Action inconnue." }, { status: 400 });
    }
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
