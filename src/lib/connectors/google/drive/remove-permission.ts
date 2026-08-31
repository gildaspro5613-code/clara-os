/**
 * ============================================
 * CLARA OS
 * Google Drive – Remove Permission
 * --------------------------------------------
 * File : remove-permission.ts
 * Responsibility :
 * Removes a specific permission from a Google
 * Drive file via DriveClient.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * Removes a permission from a Google Drive file.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates to the Drive API v3 `permissions.delete` endpoint. Errors thrown
 * by the Google API are propagated to the caller unchanged.
 *
 * @param fileId - The unique identifier of the Drive file from which the
 *   permission should be removed.
 * @param permissionId - The unique identifier of the permission to remove.
 * @returns Resolves when the permission has been successfully deleted.
 *
 * @example
 * ```ts
 * await removePermission(
 *   "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 *   "08728374627364",
 * );
 * ```
 */
export async function removePermission(
  fileId: string,
  permissionId: string,
): Promise<void> {
  const drive = await new DriveClient().create();

  await drive.permissions.delete({
    fileId,
    permissionId,
    supportsAllDrives: true,
  });
}
