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

import { CapabilityEngine } from "@/lib/capabilities/capability-engine";
import { ExperienceEngine } from "@/lib/experience/experience-engine";
import { runBrainDashboard } from "@/lib/brain/brain";
import { WisdomEngine } from "@/lib/wisdom/wisdom-engine";
import { buildDashboard } from "@/lib/brain/dashboard";
import {
  DecisionPriority,
  EventType,
} from "@/types";

import { Runtime } from "./runtime";
import { RuntimeCycle } from "./runtime-cycle";
import { RuntimeEvent } from "./runtime-event";
import { RuntimeResult } from "./runtime-result";

/**
 * Runtime Engine.
 */
export class RuntimeEngine {

  /**
   * Capability Engine.
   */
  private readonly capabilityEngine =
    new CapabilityEngine();

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
      await this.capabilityEngine.execute({

        capabilityId: event.capabilityId,

        context: event.context,

      });

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

      completedAt:
        result.completedAt,

    };

  }

}
