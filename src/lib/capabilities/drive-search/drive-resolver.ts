/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : drive-resolver.ts
 * Responsibility :
 * Resolves a free-text query to one or more
 * Drive resources using GoogleDriveEngine.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";
import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";

/**
 * Resolves Drive resources by free-text name query.
 */
export class DriveResolver {

  private _engine: GoogleDriveEngine | undefined;

  constructor(
    private readonly engineFactory?: () => GoogleDriveEngine,
  ) {}

  /**
   * Lazily returns the GoogleDriveEngine instance.
   * Auth validation is deferred until first actual use.
   */
  private getEngine(): GoogleDriveEngine {
    if (!this._engine) {
      this._engine = this.engineFactory
        ? this.engineFactory()
        : new GoogleDriveEngine();
    }
    return this._engine;
  }

  /**
   * Resolves a query to matching Drive resources.
   *
   * @param query - Free-text resource name (e.g. "RTSE Angers").
   * @returns Array of matching resources, empty array when nothing found.
   */
  public async resolve(
    query: string,
  ): Promise<DriveResourceEntry[]> {

    const result = await this.getEngine().search({
      fileName: query,
      searchQuery: query,
    });

    return result.entries ?? [];

  }

}
