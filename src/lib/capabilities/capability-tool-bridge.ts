/**
 * ============================================
 * CLARA OS
 * Capability Tool Bridge
 * --------------------------------------------
 * Converts model tool calls into capability
 * execution requests.
 *
 * Responsibility:
 * - validate the requested capability
 * - parse tool arguments
 * - delegate execution
 *
 * This layer does not decide which capability
 * should be used.
 * ============================================
 */

import {
  CapabilityEngine,
} from "./capability-engine";

import {
  CapabilityRegistry,
} from "./capability-registry";

import type {
  OpenAIToolCall,
} from "@/lib/connectors/internal/openai/responses/openai-responses-result";
import {
  authorizeCapability,
  type CapabilityExecutionPrincipal,
} from "./capability-policy";
import {
  DatabaseToolAuditRepository,
  type ToolAuditWriter,
} from "./tool-audit-repository";
import {
  DatabaseToolApprovalRepository,
  type ToolApprovalRequest,
  type ToolApprovalWriter,
} from "./tool-approval-repository";

export interface CapabilityToolBridgeResult {
  readonly success: boolean;
  readonly callId: string;
  readonly capabilityId: string;
  readonly message: string;
  readonly content?: string;
  readonly completedAt: Date;
  readonly code?: "PLAN_REQUIRED" | "APPROVAL_REQUIRED";
  readonly approvalRequest?: ToolApprovalRequest;
}

export class CapabilityToolBridge {

  public constructor(
    private readonly audit: ToolAuditWriter = new DatabaseToolAuditRepository(),
    private readonly approvals: ToolApprovalWriter = new DatabaseToolApprovalRepository(),
    private readonly engine: Pick<CapabilityEngine, "execute"> = new CapabilityEngine(),
  ) {}

  private readonly registry =
    new CapabilityRegistry();

  /**
   * Executes one model-requested capability.
   */
  public async execute(
    toolCall: OpenAIToolCall,
    principal: CapabilityExecutionPrincipal,
  ): Promise<CapabilityToolBridgeResult> {

    const capabilityId =
      toolCall.name.trim();

    if (!capabilityId) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message: "Tool call capability name is required.",
        completedAt: new Date(),
      };
    }

    if (!this.registry.has(capabilityId)) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message:
          `Unknown Clara capability: "${capabilityId}".`,
        completedAt: new Date(),
      };
    }

    await this.audit.record({
      callId: toolCall.callId,
      capabilityId,
      actorId: principal.actorId,
      workspaceId: principal.workspaceId,
      status: "REQUESTED",
    });

    let context: unknown;

    try {
      context = JSON.parse(toolCall.arguments);
    } catch {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message: "Tool call arguments are not valid JSON.",
        completedAt: new Date(),
      };
    }

    if (context === null || typeof context !== "object" || Array.isArray(context)) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message: "Tool call context must be a JSON object.",
        completedAt: new Date(),
      };
    }

    const decision = authorizeCapability(capabilityId, principal);
    if (!decision.allowed) {
      await this.audit.record({
        callId: toolCall.callId,
        capabilityId,
        actorId: principal.actorId,
        workspaceId: principal.workspaceId,
        status: "DENIED",
        message: decision.message,
      });
      const approvalRequest = decision.code === "APPROVAL_REQUIRED"
        ? await this.approvals.create({
            callId: toolCall.callId,
            capabilityId,
            arguments: toolCall.arguments,
            principal,
          })
        : undefined;
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        code: decision.code,
        message: decision.message,
        approvalRequest,
        completedAt: new Date(),
      };
    }

    const result =
      await this.engine.execute({
        capabilityId,
        context,
        workspaceId: principal.workspaceId,
      });

    await this.audit.record({
      callId: toolCall.callId,
      capabilityId,
      actorId: principal.actorId,
      workspaceId: principal.workspaceId,
      status: result.success ? "SUCCEEDED" : "FAILED",
      message: result.message,
    });

    return {
      success: result.success,
      callId: toolCall.callId,
      capabilityId,
      message: result.message,
      content: result.content,
      completedAt: result.completedAt,
    };
  }
}
