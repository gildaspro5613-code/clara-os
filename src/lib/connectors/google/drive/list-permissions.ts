/**
 * ============================================
 * CLARA OS
 * Google Drive – List Permissions
 * --------------------------------------------
 * File : list-permissions.ts
 * Responsibility :
 * Retrieves all permissions for a Google Drive
 * file via DriveClient.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

import { DriveClient } from "./drive-client";

/**
 * Lists all permissions for a Google Drive file.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates to the Drive API v3 `permissions.list` endpoint. Errors thrown
 * by the Google API are propagated to the caller unchanged.
 *
 * @param fileId - The unique identifier of the Drive file whose permissions
 *   are to be retrieved.
 * @returns An array of Google Drive permissions associated with the file.
 */
export async function listPermissions(
  fileId: string,
): Promise<drive_v3.Schema$Permission[]> {
  const drive = new DriveClient().create();

  const response = await drive.permissions.list({
    fileId,
    fields:
      "permissions(id,type,role,emailAddress,domain,allowFileDiscovery,displayName,photoLink,expirationTime,pendingOwner,deleted,permissionDetails,teamDrivePermissionDetails,view,inheritedPermissionsDisabled)",
    supportsAllDrives: true,
  });

  return response.data.permissions ?? [];
}
