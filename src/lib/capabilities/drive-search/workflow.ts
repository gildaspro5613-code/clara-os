/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : workflow.ts
 * Responsibility :
 * Orchestrates the Drive Search capability:
 * resolve → navigate (optional) → context build.
 * ============================================
 */

import { DriveResolver } from "./drive-resolver";
import { DriveNavigator } from "./drive-navigator";
import { DriveContextBuilder } from "./drive-context-builder";
import type { DriveSearchContext } from "./context";
import type { DriveSearchResult } from "./result";

/**
 * Drive Search workflow.
 */
export class DriveSearchWorkflow {

  constructor(
    private readonly resolver: DriveResolver = new DriveResolver(),
    private readonly navigator: DriveNavigator = new DriveNavigator(),
    private readonly contextBuilder: DriveContextBuilder = new DriveContextBuilder(),
  ) {}

  /**
   * Executes the Drive search workflow.
   */
  public async execute(
    context: DriveSearchContext,
  ): Promise<DriveSearchResult> {

    switch (context.operation) {

      case "search":
        return this.executeSearch(context);

      case "list":
        return this.executeList(context);

      case "read":
        return this.executeRead(context);

      default:
        return {
          success: false,
          message: `Unknown Drive operation: ${context.operation as string}`,
          completedAt: new Date(),
        };

    }

  }

  private async executeSearch(
    context: DriveSearchContext,
  ): Promise<DriveSearchResult> {

    const query = context.query ?? "";

    if (!query.trim()) {

      return {
        success: false,
        message: "search requires a non-empty query.",
        completedAt: new Date(),
      };

    }

    const entries = await this.resolver.resolve(query);

    if (entries.length === 0) {

      return {
        success: true,
        message: `No resource found in Drive matching "${query}".`,
        entries: [],
        completedAt: new Date(),
      };

    }

    const driveContext = this.contextBuilder.build(entries);

    const message =
      entries.length === 1
        ? `Found 1 resource matching "${query}": ${entries[0].name}.`
        : `Found ${entries.length} resources matching "${query}".`;

    return {
      success: true,
      message,
      entries,
      driveContext,
      completedAt: new Date(),
    };

  }

  private async executeList(
    context: DriveSearchContext,
  ): Promise<DriveSearchResult> {

    if (!context.folderId) {

      return {
        success: false,
        message: "list requires a folderId.",
        completedAt: new Date(),
      };

    }

    const entries = await this.navigator.browse(
      context.folderId,
    );

    const driveContext = this.contextBuilder.build(entries);

    return {
      success: true,
      message: `Listed ${entries.length} item(s) in folder.`,
      entries,
      driveContext,
      completedAt: new Date(),
    };

  }

  private async executeRead(
    context: DriveSearchContext,
  ): Promise<DriveSearchResult> {

    if (!context.fileId) {

      return {
        success: false,
        message: "read requires a fileId.",
        completedAt: new Date(),
      };

    }

    const { DriveReader } = await import("./drive-reader");

    const reader = new DriveReader();

    const textContent = await reader.read(
      context.fileId,
      "",
      context.mimeType,
    );

    return {
      success: true,
      message: "File content read successfully.",
      textContent,
      completedAt: new Date(),
    };

  }

}
