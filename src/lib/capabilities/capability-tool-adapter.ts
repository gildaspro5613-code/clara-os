/**
 * ============================================
 * CLARA OS
 * Capability Tool Adapter
 * --------------------------------------------
 * Converts Clara capabilities into generic
 * tool definitions consumable by a cognitive
 * model.
 * ============================================
 */

import type { CapabilityDefinition } from "./capability-registry";

/**
 * Generic parameter definition.
 */
export interface CapabilityToolParameter {
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
}

/**
 * Generic tool definition.
 *
 * This contract deliberately does not depend
 * on OpenAI or any specific model provider.
 */
export interface CapabilityToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<
    string,
    CapabilityToolParameter
  >;
}

/**
 * Converts a registered capability into a
 * model-facing tool definition.
 */
export function toCapabilityTool(
  capability: CapabilityDefinition,
): CapabilityToolDefinition {

  if (capability.id === "organize-drive") {
    return {
      name: capability.id,
      description: capability.description,
      parameters: {
        fileId: {
          type: "string",
          description:
            "Google Drive file identifier of the file to organize.",
          required: true,
        },
        folderName: {
          type: "string",
          description:
            "Target Google Drive folder name.",
          required: true,
        },
        parentFolderId: {
          type: "string",
          description:
            "Optional Google Drive parent folder identifier.",
          required: false,
        },
      },
    };
  }

  return {
    name: capability.id,
    description: capability.description,
    parameters: {},
  };
}

/**
 * Converts a complete capability catalog
 * into model-facing tool definitions.
 */
export function toCapabilityTools(
  capabilities: CapabilityDefinition[],
): CapabilityToolDefinition[] {

  return capabilities.map(
    capability => toCapabilityTool(capability),
  );

}
