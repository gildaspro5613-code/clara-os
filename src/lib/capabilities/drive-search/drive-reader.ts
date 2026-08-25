/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : drive-reader.ts
 * Responsibility :
 * Reads the plain-text content of
 * a Google Workspace document.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";

/**
 * Reads document content via GoogleDriveEngine.
 */
export class DriveReader {

  private _engine: GoogleDriveEngine | undefined;

  constructor(
    private readonly engineFactory?: () => GoogleDriveEngine,
  ) {}

  private getEngine(): GoogleDriveEngine {
    if (!this._engine) {
      this._engine = this.engineFactory
        ? this.engineFactory()
        : new GoogleDriveEngine();
    }
    return this._engine;
  }

  /**
   * Returns the plain-text content of a Drive document.
   *
   * @param fileId   - The Drive file identifier.
   * @param fileName - Display name (used for result metadata).
   * @param mimeType - MIME type hint to decide export feasibility.
   * @returns Plain-text string, or empty string for non-exportable types.
   */
  public async read(
    fileId: string,
    fileName = "",
    mimeType?: string,
  ): Promise<string> {

    const result = await this.getEngine().readContent({
      fileName,
      fileId,
      mimeType,
    });

    return result.textContent ?? "";

  }

}
