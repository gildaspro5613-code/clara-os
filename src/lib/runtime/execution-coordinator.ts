/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : execution-coordinator.ts
 * Responsibility :
 * Coordinates Autonomy Gate -> Runtime -> Verification.
 * ============================================
 */

import type { Runtime } from "./runtime";
import { RuntimeEngine } from "./runtime-engine";
import type { RuntimeEvent } from "./runtime-event";
import type { RuntimeResult } from "./runtime-result";
import type { ExecutionIntent } from "./execution-intent";
import { evaluateAutonomy, type AutonomyGateDecision } from "./autonomy-gate";
import { verifyRuntimeResult, type VerificationResult } from "./verification";

export interface ExecutionCoordinatorResult {
  readonly gate: AutonomyGateDecision;
  readonly runtimeResult?: RuntimeResult;
  readonly verification?: VerificationResult;
}

export class ExecutionCoordinator {
  private readonly runtimeEngine = new RuntimeEngine();

  public async run(
    runtime: Runtime,
    intent: ExecutionIntent,
    options: {
      executeAuthorized?: boolean;
      evidence?: unknown;
    } = {},
  ): Promise<ExecutionCoordinatorResult> {
    const gate = evaluateAutonomy(intent, {
      executeAuthorized: options.executeAuthorized,
    });

    if (gate.outcome !== "ALLOW") {
      return { gate };
    }

    const event: RuntimeEvent = {
      id: intent.id,
      source: intent.source,
      capabilityId: intent.capabilityId,
      context: intent.context,
      receivedAt: new Date(),
    };

    const runtimeResult = await this.runtimeEngine.run(runtime, event);
    const verification = verifyRuntimeResult(
      intent,
      runtimeResult,
      options.evidence,
    );

    return {
      gate,
      runtimeResult,
      verification,
    };
  }
}
