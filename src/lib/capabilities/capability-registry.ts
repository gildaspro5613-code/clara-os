/**
 * ============================================
 * CLARA OS
 * Capability Registry
 * --------------------------------------------
 * Responsibility :
 * Registers every capability available
 * inside Clara OS.
 * ============================================
 */

import {
  GenerateDocumentCapability,
  GenerateDocumentCapabilityDefinition,
} from "./generate-document/capability";

import {
  WorkspaceInstallCapability,
  WorkspaceInstallCapabilityDefinition,
} from "./workspace-install/capability";

import {
  OrganizeDriveCapability,
  OrganizeDriveCapabilityDefinition,
} from "./organize-drive/capability";

import {
  UpdateSheetRowCapability,
  UpdateSheetRowCapabilityDefinition,
} from "./update-sheet-row/capability";

import {
  AppendSheetRowCapability,
  AppendSheetRowCapabilityDefinition,
} from "./append-sheet-row/capability";

import {
  ReadSheetCapability,
  ReadSheetCapabilityDefinition,
} from "./read-sheet/capability";

import {
  FindSheetRowCapability,
  FindSheetRowCapabilityDefinition,
} from "./find-sheet-row/capability";

import {
  DeleteSheetRowCapability,
  DeleteSheetRowCapabilityDefinition,
} from "./delete-sheet-row/capability";

/**
 * Capability definition.
 */
export type CapabilityDefinition =
  | GenerateDocumentCapability
  | WorkspaceInstallCapability
  | OrganizeDriveCapability
  | UpdateSheetRowCapability
  | AppendSheetRowCapability
  | ReadSheetCapability
  | FindSheetRowCapability
  | DeleteSheetRowCapability;

/**
 * Capability Registry.
 */
export class CapabilityRegistry {

  /**
   * Registered capabilities.
   */
  private readonly capabilities: CapabilityDefinition[] = [

    GenerateDocumentCapabilityDefinition,

    WorkspaceInstallCapabilityDefinition,

    OrganizeDriveCapabilityDefinition,

    UpdateSheetRowCapabilityDefinition,

    AppendSheetRowCapabilityDefinition,

    ReadSheetCapabilityDefinition,

    FindSheetRowCapabilityDefinition,

    DeleteSheetRowCapabilityDefinition,

  ];

  /**
   * Returns every capability.
   */
  public getAll(): CapabilityDefinition[] {

    return this.capabilities;

  }

  /**
   * Finds one capability.
   */
  public findById(
    id: string,
  ): CapabilityDefinition | undefined {

    return this.capabilities.find(

      capability => capability.id === id,

    );

  }

  /**
   * Checks whether a capability exists.
   */
  public has(
    id: string,
  ): boolean {

    return this.findById(id) !== undefined;

  }

}