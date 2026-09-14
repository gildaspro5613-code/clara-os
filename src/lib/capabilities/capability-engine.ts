/**
 * ============================================
 * CLARA OS
 * Capability Engine
 * --------------------------------------------
 * File : capability-engine.ts
 * Responsibility :
 * Executes Clara capabilities.
 * ============================================
 */

import { CapabilityRegistry } from "./capability-registry";

import { GenerateDocumentContext } from "./generate-document/context";
import { GenerateDocumentWorkflow } from "./generate-document/workflow";

import { WorkspaceInstallContext } from "./workspace-install/context";
import { WorkspaceInstallWorkflow } from "./workspace-install/workflow";

import { GitHubReadExecutor, type OperationalCapabilityResult } from "./github-read/executor";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { MakeConnectorAdapter, MAKE_CAPABILITIES } from "@/lib/connectors/make";
import { MAGICQ_CAPABILITIES } from "@/lib/connectors/internal/chamsys/magicq";
import { DisabledMagicQLightingExecutor, executeMagicQFixtureIntensityCapability, type MagicQLightingExecutor } from "./magicq-lighting/executor";
import { ConnectorEngine } from "@/lib/connectors/core/connector-engine";
import type { ConnectorContext } from "@/lib/connectors/core/connector-context";
import { GoogleWorkspaceConnector, GOOGLE_WORKSPACE_CAPABILITIES } from "@/lib/connectors/google";

/**
 * Capability execution request.
 */
export interface CapabilityExecutionRequest {
  readonly capabilityId: string;
  readonly context: unknown;
  readonly workspaceId?: string;
}

/**
 * Capability execution result.
 */
export interface CapabilityExecutionResult {
  readonly success: boolean;
  readonly message: string;
  readonly content?: string;
  readonly documentId?: string;
  readonly documentUrl?: string;
  /** Provider-neutral operational result for connector-backed capabilities. */
  readonly operationalResult?: OperationalCapabilityResult;
  readonly completedAt: Date;
}

/**
 * Capability Engine.
 */
export class CapabilityEngine {
  public constructor(
    private readonly githubRead = new GitHubReadExecutor(),
    private readonly magicqLighting: MagicQLightingExecutor =
      new DisabledMagicQLightingExecutor(),
  ) {}

  private readonly registry = new CapabilityRegistry();
  private readonly connections = new DatabaseConnectionRepository();
  private readonly make = new MakeConnectorAdapter(
    new ConnectionResolver(this.connections, new CredentialStore()),
  );
  private readonly connectorEngine = new ConnectorEngine();

  private readonly generateDocument = new GenerateDocumentWorkflow();
  private readonly workspaceInstall = new WorkspaceInstallWorkflow();

  /**
   * Executes one capability.
   */
  public async execute(
    request: CapabilityExecutionRequest,
  ): Promise<CapabilityExecutionResult> {
    const capability = this.registry.findById(request.capabilityId);

    if (!capability) {
      return {
        success: false,
        message: `Unknown capability: ${request.capabilityId}`,
        completedAt: new Date(),
      };
    }

    if (
      (GOOGLE_WORKSPACE_CAPABILITIES as readonly string[]).includes(
        request.capabilityId,
      )
    ) {
      return this.executeGoogleWorkspace(request);
    }

    switch (request.capabilityId) {
      case MAKE_CAPABILITIES.SCENARIO_PREPARE: {
        const result = await this.make.execute("not-required", {
          capability: MAKE_CAPABILITIES.SCENARIO_PREPARE,
          input: request.context as { scenarioKey: string; payload?: Record<string, unknown> },
        });
        return {
          success: true,
          message: "Make scenario prepared.",
          content: JSON.stringify(result.data),
          completedAt: new Date(),
        };
      }

      case MAKE_CAPABILITIES.SCENARIO_EXECUTE: {
        if (!request.workspaceId) {
          return {
            success: false,
            message: "Workspace identity is required for Make execution.",
            completedAt: new Date(),
          };
        }
        const connection = await this.connections.findByWorkspaceAndProvider(
          request.workspaceId,
          "make",
        );
        if (!connection) {
          return {
            success: false,
            message: "Make is not configured for this Clara OS workspace.",
            completedAt: new Date(),
          };
        }
        const result = await this.make.execute(connection.id, {
          capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
          input: request.context as { scenarioKey: string; payload?: Record<string, unknown> },
        });
        return {
          success: true,
          message: "Make scenario executed.",
          content: JSON.stringify(result.data),
          completedAt: new Date(),
        };
      }

      case MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET:
        return executeMagicQFixtureIntensityCapability(
          this.magicqLighting,
          request.workspaceId,
          request.context,
        );

      case "github.repository.list":
      case "github.repository.read":
      case "github.branch.list":
      case "github.file.read":
      case "github.commit.list":
      case "github.issue.list":
      case "github.issue.read":
      case "github.pull_request.list":
      case "github.pull_request.read":
      case "github.checks.read": {
        const result = await this.githubRead.execute(
          request.capabilityId,
          request.context,
        );
        return {
          success: result.success,
          message: result.success
            ? `GitHub READ capability completed: ${request.capabilityId}`
            : result.error?.message ?? "GitHub READ capability failed.",
          content: result.success ? JSON.stringify(result.data) : undefined,
          operationalResult: result,
          completedAt: new Date(),
        };
      }

      case "generate-document": {
        const result = await this.generateDocument.execute(
          request.context as GenerateDocumentContext,
        );
        return {
          success: result.success,
          message: result.message,
          content: result.content,
          documentId: result.documentId,
          documentUrl: result.documentUrl,
          completedAt: result.completedAt,
        };
      }

      case "workspace-install": {
        const result = await this.workspaceInstall.execute(
          request.context as WorkspaceInstallContext,
        );
        return {
          success: result.success,
          message: result.message,
          completedAt: result.completedAt,
        };
      }

      default:
        return {
          success: false,
          message: "Capability not implemented.",
          completedAt: new Date(),
        };
    }
  }

  private async executeGoogleWorkspace(
    request: CapabilityExecutionRequest,
  ): Promise<CapabilityExecutionResult> {
    const connectorContext: ConnectorContext = {
      brain: {} as ConnectorContext["brain"],
      experiences: [],
      recommendations: [],
      configuration: {
        workspaceId: request.workspaceId ?? "default",
      },
      createdAt: new Date(),
    };

    const connector = new GoogleWorkspaceConnector(connectorContext);
    const result = await this.connectorEngine.execute(connector, {
      id: crypto.randomUUID(),
      capability: request.capabilityId,
      payload: request.context,
      source: "capability-engine",
      receivedAt: new Date(),
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? result.message ?? "Google Workspace execution failed.",
        completedAt: result.completedAt,
      };
    }

    const projection = projectGoogleWorkspaceResult(
      request.capabilityId,
      result.data,
    );

    return {
      success: true,
      message: result.message ?? `${request.capabilityId} executed successfully.`,
      ...projection,
      completedAt: result.completedAt,
    };
  }
}

function projectGoogleWorkspaceResult(
  capabilityId: string,
  data: unknown,
): Pick<
  CapabilityExecutionResult,
  "content" | "documentId" | "documentUrl"
> {
  if (capabilityId === "find-document") {
    const document = data as
      | { id?: string; name?: string; webViewLink?: string }
      | null;
    return {
      content: document ? JSON.stringify(document) : undefined,
      documentId: document?.id,
      documentUrl: document?.webViewLink,
    };
  }

  if (capabilityId === "read-document") {
    const document = data as {
      documentId?: string;
      title?: string;
      content?: string;
    };
    return {
      content: document.content,
      documentId: document.documentId,
    };
  }

  if (
    capabilityId === "create-calendar-event" ||
    capabilityId === "update-calendar-event"
  ) {
    const event = data as { id?: string; htmlLink?: string };
    return {
      content: JSON.stringify({
        eventId: event.id,
        eventUrl: event.htmlLink,
      }),
      documentUrl: event.htmlLink,
    };
  }

  if (capabilityId === "send-gmail") {
    const message = data as { id?: string; threadId?: string };
    return {
      content: JSON.stringify({
        messageId: message.id,
        threadId: message.threadId,
      }),
    };
  }

  if (data === undefined) return {};

  return {
    content: safeStringify(data),
  };
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
