/**
 * ============================================
 * CLARA OS
 * Capability Registry
 * --------------------------------------------
 * Responsibility :
 * Registers capabilities with an implemented
 * in-process Clara OS workflow.
 * ============================================
 */

import { isKnownCapabilityId } from "./capability-catalog";
import {
  GenerateDocumentCapability,
  GenerateDocumentCapabilityDefinition,
} from "./generate-document/capability";
import {
  WorkspaceInstallCapability,
  WorkspaceInstallCapabilityDefinition,
} from "./workspace-install/capability";

/**
 * Implemented capability definition.
 *
 * The canonical capability catalog is broader: it also contains capabilities
 * routed to connectors/services. The Registry represents the subset currently
 * implemented directly by CapabilityEngine workflows.
 */
export type CapabilityDefinition =
  | GenerateDocumentCapability
  | WorkspaceInstallCapability;

export class CapabilityRegistry {
  private readonly capabilities: CapabilityDefinition[] = [
    GenerateDocumentCapabilityDefinition,
    WorkspaceInstallCapabilityDefinition,
  ];

  public getAll(): CapabilityDefinition[] {
    return this.capabilities;
  }

  public findById(id: string): CapabilityDefinition | undefined {
    if (!isKnownCapabilityId(id)) {
      return undefined;
    }

    return this.capabilities.find((capability) => capability.id === id);
  }

  public has(id: string): boolean {
    return this.findById(id) !== undefined;
  }
}
