/**
 * ============================================
 * CLARA OS
 * Runtime Engine
 * --------------------------------------------
 * File : runtime-engine.ts
 * Responsibility :
 * Coordinates one complete Clara
 * runtime execution.
 * ============================================
 */

import {
  CapabilityEngine,
  type CapabilityExecutionResult,
} from "@/lib/capabilities/capability-engine";
import { ConnectorEngine } from "@/lib/connectors/core/connector-engine";
import { ExperienceEngine } from "@/lib/experience/experience-engine";
import { runBrainDashboard } from "@/lib/brain/brain";
import { WisdomEngine } from "@/lib/wisdom/wisdom-engine";
import {
  DecisionPriority,
  EventType,
} from "@/types";

import {
  CapabilityRouter,
  type Capability,
} from "./capability-router";
import { Runtime } from "./runtime";
import { RuntimeCycle } from "./runtime-cycle";
import { RuntimeEvent } from "./runtime-event";
import { RuntimeResult } from "./runtime-result";

const CONNECTOR_CAPABILITIES = new Set<Capability>([
  "generate-text",
  "send-email",
  "schedule-event",
  "store-file",
  "retrieve-file",
  "create-document",
  "retrieve-document",
  "read-spreadsheet-range",
  "write-spreadsheet-range",
  "text-to-speech",
  "list-voices",
]);

function isConnectorCapability(value: string): value is Capability {
  return CONNECTOR_CAPABILITIES.has(value as Capability);
}

function connectorContent(data: unknown): string | undefined {
  if (data === undefined) return undefined;

  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    typeof (data as { content?: unknown }).content === "string"
  ) {
    return (data as { content: string }).content;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return undefined;
  }
}

/**
 * Runtime Engine.
 */
export class RuntimeEngine {

  /**
   * Capability Engine.
   */
  public constructor(
    private readonly capabilityEngine = new CapabilityEngine(),
  ) {}

  private readonly connectorEngine = new ConnectorEngine();
  private readonly capabilityRouter = new CapabilityRouter();

  /**
   * Experience Engine.
   */
  private readonly experienceEngine =
    new ExperienceEngine();

  /**
   * Wisdom Engine.
   */
  private readonly wisdomEngine =
    new WisdomEngine();

  private async executeCapability(
    event: RuntimeEvent,
  ): Promise<CapabilityExecutionResult> {
    if (!isConnectorCapability(event.capabilityId)) {
      return this.capabilityEngine.execute({
        capabilityId: event.capabilityId,
        context: event.context,
      });
    }

    const route = this.capabilityRouter.resolve(
      event.capabilityId,
      event.context,
    );

    if (route === "unknown") {
      return {
        success: false,
        message: `No native connector route for capability: ${event.capabilityId}`,
        completedAt: new Date(),
      };
    }

    const connectorResult = await this.connectorEngine.executeRoute(route, {
      id: event.id,
      capability: event.capabilityId,
      payload: event.context,
      source: event.source,
      receivedAt: event.receivedAt,
    });

    return {
      success: connectorResult.success,
      message:
        connectorResult.error ??
        connectorResult.message ??
        "Connector execution completed.",
      content: connectorContent(connectorResult.data),
      completedAt: connectorResult.completedAt,
    };
  }

  /**
   * Executes one runtime cycle.
   */
  public async run(
    runtime: Runtime,
    event: RuntimeEvent,
  ): Promise<RuntimeResult> {

    const cycles: RuntimeCycle[] = [

      RuntimeCycle.RECEIVE,

      RuntimeCycle.CONTEXT,

    ];

    const result =
      await this.executeCapability(event);

    cycles.push(
      RuntimeCycle.EXECUTE,
    );

    const experience =
      this.experienceEngine.recordExperience({

        id:
          crypto.randomUUID(),

        title:
          `Runtime execution: ${event.capabilityId}`,

        category:
          result.success
            ? "success"
            : "incident",

        description:
          result.message,

        createdAt:
          result.completedAt,

        tags: [
          "runtime",
          event.source,
          event.capabilityId,
          result.success
            ? "success"
            : "failure",
        ],

      });

    experience.summary =
      result.message;

    experience.confidence =
      result.success
        ? 1
        : 0;

    const learnedExperience =
      this.experienceEngine.extractLessons(
        experience,
      );

    const promotedExperience =
      this.experienceEngine.promoteKnowledge(
        learnedExperience,
      );

    runtime.context.experiences.push(
      promotedExperience,
    );

    cycles.push(
      RuntimeCycle.LEARN,
    );

    /*
     * Build the Brain event from the completed
     * Runtime execution.
     */
    const brainEvent = {
      id: event.id,
      type: EventType.TASK_COMPLETED,
      source: event.source,
      timestamp: event.receivedAt,
      payload: {
        result: {
          success: result.success,
          message: result.message,
          outputs:
            result.content
              ? [result.content]
              : undefined,
          documentId:
            result.documentId,
          documentUrl:
            result.documentUrl,
        },
      },
    };

    /*
     * Think.
     *
     * Use the official Brain pipeline so Runtime,
     * Brain and Mission share the same dashboard.
     */
    const brainDashboard =
      await runBrainDashboard(
        brainEvent,
      );

    const brainContext = {
      context:
        brainDashboard.context,

      knowledge:
        (await import("@/lib/knowledge")).getKnowledge(),

      memory:
        brainDashboard.memory,

      sources:
        brainDashboard.sources,

      capabilities:
        [],
    };

    const {
      understanding,
    } = brainDashboard;

    cycles.push(
      RuntimeCycle.THINK,
    );

    /*
     * Decide through Wisdom.
     */
    const wisdomContext = {
      brain:
        brainContext,
      understanding,
      experiences:
        runtime.context.experiences,
      recommendations:
        runtime.context.recommendations,
      evaluatedAt: new Date(),
    };

    const wisdom =
      this.wisdomEngine.buildWisdom(
        wisdomContext,
      );

    const recommendation =
      this.wisdomEngine.createRecommendation(
        wisdom,
      );

    const decision =
      this.wisdomEngine.createDecision(
        recommendation,
      );

    const priority =
      this.wisdomEngine.prioritize(
        decision,
      );

    runtime.context.recommendations.push(
      recommendation,
    );

    cycles.push(
      RuntimeCycle.DECIDE,
      RuntimeCycle.PUBLISH,
      RuntimeCycle.COMPLETE,
    );

    return {

      success:
        result.success,

      message:
        result.message,

      runtimeId:
        runtime.id,

      eventId:
        event.id,

      cycles,

      experienceCount:
        runtime.context.experiences.length,

      experience:
        promotedExperience,

      recommendations: [
        recommendation,
      ],

      priority,

      brain:
        brainDashboard,

      outputs:
        result.content
          ? [result.content]
          : undefined,

      documentId:
        result.documentId,

      documentUrl:
        result.documentUrl,

      operationalResult:
        result.operationalResult,

      completedAt:
        result.completedAt,

    };

  }

}
