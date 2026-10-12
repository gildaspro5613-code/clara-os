import type { drive_v3 } from "googleapis";
import { DocumentReadError } from "./document-read-error";

export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
export async function requireDriveFolder(drive: drive_v3.Drive, id: string) {
  const result = await drive.files.get({ fileId: id, fields: "id,mimeType,parents,trashed", supportsAllDrives: true });
  if (result.data.mimeType !== DRIVE_FOLDER_MIME || result.data.trashed) {
    throw new DocumentReadError("INVALID_FOLDER", "La destination doit être un dossier Google Drive accessible.", 400);
  }
  return result.data;
}

export async function createDriveFolder(drive: drive_v3.Drive, name: unknown, parentId = "root") {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
    throw new DocumentReadError("INVALID_FOLDER_NAME", "Nom de dossier invalide.", 400);
  }
  await requireDriveFolder(drive, parentId);
  const result = await drive.files.create({
    requestBody: { name: name.trim(), mimeType: DRIVE_FOLDER_MIME, parents: [parentId] },
    fields: "id,name", supportsAllDrives: true,
  });
  return { id: result.data.id, name: result.data.name };
}

export async function moveDriveResource(drive: drive_v3.Drive, fileId: string, destinationId: string) {
  if (!fileId || !destinationId || fileId === destinationId || fileId === "root") {
    throw new DocumentReadError("INVALID_MOVE", "Déplacement invalide.", 400);
  }
  const source = await drive.files.get({ fileId, fields: "id,name,parents,mimeType,trashed", supportsAllDrives: true });
  const destination = await requireDriveFolder(drive, destinationId);
  if (source.data.trashed || !source.data.parents?.length) {
    throw new DocumentReadError("INVALID_MOVE_SOURCE", "Impossible de déplacer un élément supprimé ou sans parent connu.", 409);
  }
  if (source.data.parents.includes(destination.id ?? destinationId)) {
    throw new DocumentReadError("ALREADY_IN_FOLDER", "Cet élément se trouve déjà dans le dossier choisi.", 409);
  }
  if (source.data.mimeType === DRIVE_FOLDER_MIME) {
    // Drive also enforces cycles atomically; verify ancestors for an explicit error.
    const pending = [destination];
    const visited = new Set<string>();
    while (pending.length) {
      const folder = pending.pop()!;
      if (folder.id === fileId) throw new DocumentReadError("FOLDER_CYCLE", "Un dossier ne peut pas être déplacé dans un de ses sous-dossiers.", 400);
      if (!folder.id || visited.has(folder.id)) continue;
      visited.add(folder.id);
      if (visited.size > 100) throw new DocumentReadError("FOLDER_DEPTH_LIMIT", "Arborescence trop profonde pour vérifier ce déplacement.", 422);
      for (const parent of folder.parents ?? []) pending.push(await requireDriveFolder(drive, parent));
    }
  }
  await drive.files.update({ fileId, addParents: destinationId, removeParents: source.data.parents.join(","), requestBody: {}, fields: "id,name,parents", supportsAllDrives: true });
  return source.data;
}
