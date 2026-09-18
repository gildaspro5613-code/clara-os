/**
 * ============================================
 * CLARA OS
 * Capability Engine
 * --------------------------------------------
 * Executes horizontal Clara capabilities.
 * ============================================
 */

import { CapabilityRegistry } from "./capability-registry";
import { GenerateDocumentContext } from "./generate-document/context";
import { GenerateDocumentWorkflow } from "./generate-document/workflow";
import { WorkspaceInstallContext } from "./workspace-install/context";
import { WorkspaceInstallWorkflow } from "./workspace-install/workflow";
import { GitHubReadExecutor } from "./github-read/executor";
import type { OperationalCapabilityResult } from "./operational-result";
import { MakeCapabilityExecutor } from "./make/executor";
import { MAKE_CAPABILITIES } from "@/lib/connectors/make";
import { ConnectorEngine } from "@/lib/connectors/core/connector-engine";
import type { ConnectorContext } from "@/lib/connectors/core/connector-context";
import { GoogleWorkspaceConnector, GOOGLE_WORKSPACE_CAPABILITIES } from "@/lib/connectors/google";

export interface CapabilityExecutionRequest {
  readonly capabilityId: string;
  readonly context: unknown;
  readonly workspaceId?: string;
}

export interface CapabilityExecutionResult {
  readonly success: boolean;
  readonly message: string;
  readonly content?: string;
  readonly documentId?: string;
  readonly documentUrl?: string;
  readonly operationalResult?: OperationalCapabilityResult;
  readonly completedAt: Date;
}

/**
 * Generic Clara OS capability engine. Vertical-specific execution belongs to
 * the corresponding vertical runtime and is not registered here.
 */
export class CapabilityEngine {
  public constructor(
    private readonly githubRead = new GitHubReadExecutor(),
    private readonly makeCapability = new MakeCapabilityExecutor(),
  ) {}

  private readonly registry = new CapabilityRegistry();
  private readonly connectorEngine = new ConnectorEngine();
  private readonly generateDocument = new GenerateDocumentWorkflow();
  private readonly workspaceInstall = new WorkspaceInstallWorkflow();

  public async execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const capability = this.registry.findById(request.capabilityId);
    if (!capability) {
      return { success: false, message: `Unknown capability: ${request.capabilityId}`, completedAt: new Date() };
    }

    if ((GOOGLE_WORKSPACE_CAPABILITIES as readonly string[]).includes(request.capabilityId)) {
      return this.executeGoogleWorkspace(request);
    }

    switch (request.capabilityId) {
      case MAKE_CAPABILITIES.SCENARIO_PREPARE:
      case MAKE_CAPABILITIES.SCENARIO_EXECUTE: {
        const result = await this.makeCapability.execute(
          request.capabilityId,
          request.workspaceId,
          request.context,
        );
        return {
          success: result.success,
          message: result.success
            ? `Make capability ${result.status ?? "completed"}.`
            : result.error?.message ?? "Make capability failed.",
          content: result.success ? safeStringify(result.data) : undefined,
          operationalResult: result,
          completedAt: new Date(),
        };
      }

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
        const result = await this.githubRead.execute(request.capabilityId, request.context);
        return {
          success: result.success,
          message: result.success
            ? `GitHub READ capability completed: ${request.capabilityId}`
            : result.error?.message ?? "GitHub READ capability failed.",
          content: result.success ? safeStringify(result.data) : undefined,
          operationalResult: result,
          completedAt: new Date(),
        };
      }

      case "generate-document": {
        const result = await this.generateDocument.execute(request.context as GenerateDocumentContext);
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
        const result = await this.workspaceInstall.execute(request.context as WorkspaceInstallContext);
        return { success: result.success, message: result.message, completedAt: result.completedAt };
      }

      default:
        return { success: false, message: "Capability not implemented.", completedAt: new Date() };
    }
  }

  private async executeGoogleWorkspace(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const connectorContext: ConnectorContext = {
      brain: {} as ConnectorContext["brain"],
      experiences: [],
      recommendations: [],
      configuration: { workspaceId: request.workspaceId ?? "default" },
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

    return {
      success: true,
      message: result.message ?? `${request.capabilityId} executed successfully.`,
      ...projectGoogleWorkspaceResult(request.capabilityId, result.data),
      completedAt: result.completedAt,
    };
  }
}

function projectGoogleWorkspaceResult(
  capabilityId: string,
  data: unknown,
): Pick<CapabilityExecutionResult, "content" | "documentId" | "documentUrl"> {
  if (capabilityId === "find-document") {
    const document = data as { id?: string; name?: string; webViewLink?: string } | null;
    return {
      content: document ? safeStringify(document) : undefined,
      documentId: document?.id,
      documentUrl: document?.webViewLink,
    };
  }
  if (capabilityId === "read-document") {
    const document = data as { documentId?: string; title?: string; content?: string };
    return { content: document.content, documentId: document.documentId };
  }
  if (capabilityId === "create-calendar-event" || capabilityId === "update-calendar-event") {
    const event = data as { id?: string; htmlLink?: string };
    return { content: safeStringify({ eventId: event.id, eventUrl: event.htmlLink }), documentUrl: event.htmlLink };
  }
  if (capabilityId === "send-gmail") {
    const message = data as { id?: string; threadId?: string };
    return { content: safeStringify({ messageId: message.id, threadId: message.threadId }) };
  }
  return data === undefined ? {} : { content: safeStringify(data) };
}

function safeStringify(value: unknown): string | undefined {
  try { return JSON.stringify(value); } catch { return undefined; }
}
