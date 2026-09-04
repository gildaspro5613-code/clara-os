import { ConnectionResolutionError } from "@/lib/connections/connection-resolver";
import { GitHubConnectorAdapter, type GitHubCapabilityInput } from "@/lib/connectors/github/adapter";
import { GitHubConnectorDefinition } from "@/lib/connectors/github/definition";
import { GitHubApiError } from "@/lib/connectors/github/errors";

export interface GitHubReadContext { readonly connectionId: string; readonly input: unknown }
export interface OperationalCapabilityResult {
  readonly capabilityId: string;
  readonly success: boolean;
  readonly provider: "github";
  readonly connectionId?: string;
  readonly data?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}
export interface GitHubReadAdapter {
  execute(connectionId: string, request: GitHubCapabilityInput): Promise<{ provider: "github"; capability: GitHubCapabilityInput["capability"]; data: unknown }>;
}

const readCapabilities = new Set(GitHubConnectorDefinition.capabilities
  .filter((capability) => capability.operationType === "READ")
  .map((capability) => capability.id));

async function defaultAdapter(): Promise<GitHubReadAdapter> {
  const [{ ConnectionResolver }, { DatabaseConnectionRepository }, { CredentialStore }] = await Promise.all([
    import("@/lib/connections/connection-resolver"),
    import("@/lib/connections/connection-repository"),
    import("@/lib/connections/credential-store"),
  ]);
  const resolver = new ConnectionResolver(new DatabaseConnectionRepository(), new CredentialStore());
  return new GitHubConnectorAdapter(resolver);
}

/** Executes only the connector's declared READ operations. */
export class GitHubReadExecutor {
  constructor(private readonly adapterFactory: () => GitHubReadAdapter | Promise<GitHubReadAdapter> = defaultAdapter) {}

  async execute(capabilityId: string, context: unknown): Promise<OperationalCapabilityResult> {
    const candidate = context as Partial<GitHubReadContext> | null;
    const connectionId = typeof candidate?.connectionId === "string" ? candidate.connectionId.trim() : "";
    if (!readCapabilities.has(capabilityId)) {
      return this.failure(capabilityId, connectionId, "UNSUPPORTED_CAPABILITY", "This execution path supports GitHub READ capabilities only.");
    }
    if (!connectionId) {
      return this.failure(capabilityId, undefined, "CONNECTION_REQUIRED", "An active GitHub connection is required.");
    }
    try {
      const adapter = await this.adapterFactory();
      const result = await adapter.execute(connectionId, {
        capability: capabilityId,
        input: candidate?.input ?? {},
      } as GitHubCapabilityInput);
      return { capabilityId, success: true, provider: "github", connectionId, data: result.data };
    } catch (error) {
      if (error instanceof ConnectionResolutionError) {
        return this.failure(capabilityId, connectionId, error.code, "The GitHub connection is unavailable or incompatible.");
      }
      if (error instanceof GitHubApiError) {
        return this.failure(capabilityId, connectionId, error.code, error.message);
      }
      return this.failure(capabilityId, connectionId, "GITHUB_EXECUTION_FAILED", "GitHub could not complete the read operation.");
    }
  }

  private failure(capabilityId: string, connectionId: string | undefined, code: string, message: string): OperationalCapabilityResult {
    return { capabilityId, success: false, provider: "github", connectionId: connectionId || undefined, error: { code, message } };
  }
}
