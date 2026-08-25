/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : drive-context-builder.ts
 * Responsibility :
 * Builds a structured Drive context
 * ready to be injected into an LLM prompt.
 * ============================================
 */

import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";
import type { DriveContext } from "./result";

/**
 * Builds a minimal, LLM-safe Drive context from raw Drive resources.
 */
export class DriveContextBuilder {

  /**
   * Builds a Drive context from a list of resources.
   *
   * When one result is returned the primary resource is set.
   * When multiple results are returned all matches are listed.
   *
   * @param entries - Drive resources returned by search or list.
   * @returns Structured context ready for LLM prompt injection.
   */
  public build(
    entries: DriveResourceEntry[],
  ): DriveContext | undefined {

    if (entries.length === 0) {

      return undefined;

    }

    const primary = entries[0];

    return {

      id: primary.id,

      name: primary.name,

      mimeType: primary.mimeType,

      parents: primary.parents,

      webViewLink: primary.webViewLink,

      matches:
        entries.length > 1
          ? entries.map((e) => ({
              id: e.id,
              name: e.name,
              mimeType: e.mimeType,
              webViewLink: e.webViewLink,
            }))
          : undefined,

    };

  }

  /**
   * Serialises a DriveContext as a compact JSON string
   * suitable for injection into a system/user prompt.
   */
  public serialise(
    driveContext: DriveContext,
  ): string {

    return JSON.stringify(driveContext, null, 2);

  }

}
