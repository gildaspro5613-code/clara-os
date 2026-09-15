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
  DriveSearchCapability,
  DriveSearchCapabilityDefinition,
} from "./drive-search/capability";

/**
 * Capability definition.
 */
export type CapabilityDefinition =
  | GenerateDocumentCapability
  | WorkspaceInstallCapability
  | DriveSearchCapability;

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

    DriveSearchCapabilityDefinition,

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