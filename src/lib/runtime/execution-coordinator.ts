import type { Runtime } from "./runtime";
import { RuntimeEngine } from "./runtime-engine";
import type { RuntimeEvent } from "./runtime-event";
import type { RuntimeResult } from "./runtime-result";
import type { ExecutionIntent } from "./execution-intent";
import { evaluateAutonomy, type AutonomyGateDecision } from "./autonomy-gate";
import { verifyRuntimeResult, type VerificationResult } from "./verification";
import { applyVerificationToMission } from "@/modules/missions/apply-verification";
import { recordVerifiedExecution } from "@/lib/core/operational-journal-store";
import type { Mission } from "@/modules/missions/types/Mission";

export interface ExecutionCoordinatorResult {
  readonly gate: AutonomyGateDecision;
  readonly runtimeResult?: RuntimeResult;
  readonly verification?: VerificationResult;
  readonly mission?: Mission;
}

function inferEvidence(result: RuntimeResult): unknown {
  return (
    result.operationalResult ??
    result.documentId ??
    result.documentUrl ??
    result.outputs?.[0]
  );
}

/** Single controlled seam: Autonomy Gate -> Runtime -> Verification -> Mission -> Journal. */
export class ExecutionCoordinator {
  private readonly runtimeEngine = new RuntimeEngine();

  public async run(
    runtime: Runtime,
    intent: ExecutionIntent,
    options: { executeAuthorized?: boolean; evidence?: unknown } = {},
  ): Promise<ExecutionCoordinatorResult> {
    const gate = evaluateAutonomy(intent, {
      executeAuthorized: options.executeAuthorized,
    });

    if (gate.outcome !== "ALLOW") return { gate };

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
      options.evidence ?? inferEvidence(runtimeResult),
    );

    if (verification.status !== "VERIFIED") {
      return { gate, runtimeResult, verification };
    }

    const mission = await applyVerificationToMission(
      intent,
      verification,
      runtimeResult,
    );

    await recordVerifiedExecution({ intent, runtimeResult, verification });

    return { gate, runtimeResult, verification, mission };
  }
}
