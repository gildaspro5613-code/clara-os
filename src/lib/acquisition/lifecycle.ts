import type { AcquisitionDecisionBrief } from "./decision-brief";
import type { AcquisitionQualification } from "./qualification";

export type AcquisitionLifecycleState =
  | "received"
  | "qualifying"
  | "qualified"
  | "decision-required"
  | "specialist-review"
  | "proposal-preparation"
  | "closed";

export interface AcquisitionLifecycle {
  schema: "clara.acquisition-lifecycle.v1";
  submissionId: string;
  state: AcquisitionLifecycleState;
  previousState?: AcquisitionLifecycleState;
  nextAction: string;
  decisionRequired: boolean;
  updatedAt: string;
}

export type AcquisitionLifecycleSignal =
  | { type: "qualification-updated"; qualification: AcquisitionQualification; brief: AcquisitionDecisionBrief }
  | { type: "operator-approved-specialist" }
  | { type: "operator-approved-opportunity" }
  | { type: "specialist-review-completed" }
  | { type: "proposal-prepared" }
  | { type: "closed" };

export function initialAcquisitionLifecycle(
  submissionId: string,
  now = new Date(),
): AcquisitionLifecycle {
  return {
    schema: "clara.acquisition-lifecycle.v1",
    submissionId,
    state: "received",
    nextAction: "Qualifier la demande.",
    decisionRequired: false,
    updatedAt: now.toISOString(),
  };
}

export function advanceAcquisitionLifecycle(
  current: AcquisitionLifecycle,
  signal: AcquisitionLifecycleSignal,
  now = new Date(),
): AcquisitionLifecycle {
  let state: AcquisitionLifecycleState = current.state;
  let nextAction = current.nextAction;
  let decisionRequired = false;

  switch (signal.type) {
    case "qualification-updated":
      if (signal.qualification.qualification.completeness === "needs-information") {
        state = "qualifying";
        nextAction = signal.qualification.clara.nextAction;
      } else if (signal.brief.decision.required) {
        state = "decision-required";
        nextAction = signal.brief.decision.question;
        decisionRequired = true;
      } else {
        state = "qualified";
        nextAction = signal.qualification.clara.nextAction;
      }
      break;
    case "operator-approved-specialist":
      state = "specialist-review";
      nextAction = "Préparer et lancer l'expertise spécialisée autorisée.";
      break;
    case "operator-approved-opportunity":
      state = "proposal-preparation";
      nextAction = "Préparer la proposition commerciale.";
      break;
    case "specialist-review-completed":
      state = "decision-required";
      nextAction = "Présenter la synthèse enrichie et la prochaine décision engageante.";
      decisionRequired = true;
      break;
    case "proposal-prepared":
      state = "decision-required";
      nextAction = "Présenter la proposition préparée pour validation avant envoi.";
      decisionRequired = true;
      break;
    case "closed":
      state = "closed";
      nextAction = "Aucune action.";
      break;
  }

  return {
    ...current,
    previousState: current.state,
    state,
    nextAction,
    decisionRequired,
    updatedAt: now.toISOString(),
  };
}
