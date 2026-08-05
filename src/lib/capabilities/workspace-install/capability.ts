/**
 * ============================================
 * CLARA OS
 * Workspace Install Capability
 * ============================================
 */

export interface WorkspaceInstallCapability {

  id: "workspace-install";

  name: string;

  description: string;

}

export const WorkspaceInstallCapabilityDefinition: WorkspaceInstallCapability = {

  id: "workspace-install",

  name: "Workspace Installation",

  description:
    "Creates a complete Google Workspace.",

};