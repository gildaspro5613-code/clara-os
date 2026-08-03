/**
 * ============================================
 * CLARA OS
 * Capability Registry
 * --------------------------------------------
 * File : capability-registry.ts
 * Responsibility :
 * Registers every capability available
 * inside Clara OS.
 * ============================================
 */

import {
  GenerateDocumentCapability,
  GenerateDocumentCapabilityDefinition,
} from "./generate-document/capability";

/**
 * Capability definition.
 */
export type CapabilityDefinition =
  | GenerateDocumentCapability;

/**
 * Capability Registry.
 */
export class CapabilityRegistry {

  /**
   * Registered capabilities.
   */
  private readonly capabilities: CapabilityDefinition[] = [

    GenerateDocumentCapabilityDefinition,

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