import { GitHubConnectorDefinition } from "@/lib/connectors/github/definition";

export interface GitHubReadCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly provider: "github";
  readonly operationType: "READ";
}

/** The GitHub connector remains the source of truth for the registered READ surface. */
export const GitHubReadCapabilityDefinitions: GitHubReadCapability[] =
  GitHubConnectorDefinition.capabilities
    .filter((capability) => capability.operationType === "READ")
    .map((capability) => ({
      id: capability.id,
      name: capability.id,
      description: capability.description,
      provider: "github",
      operationType: "READ",
    }));
