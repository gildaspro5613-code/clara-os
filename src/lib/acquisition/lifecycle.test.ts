import { describe, expect, it } from "vitest";

import type { AcquisitionDecisionBrief } from "./decision-brief";
import type { AcquisitionQualification } from "./qualification";
import { advanceAcquisitionLifecycle, initialAcquisitionLifecycle } from "./lifecycle";

function qualification(completeness: "ready" | "needs-information"): AcquisitionQualification {
  return {
    schema: "clara.acquisition-qualification.v1",
    submissionId: "submission-123",
    source: { system: "melodie-digital-site", channel: "website", locale: "fr" },
    opportunity: {
      projectType: "Spectacle",
      disciplines: ["Lighting"],
      location: completeness === "ready" ? "Paris" : null,
      schedule: "2027",
      brief: "Préparer le projet.",
    },
    qualification: {
      completeness,
      acquired: ["projectType", "brief"],
      missing: completeness === "ready" ? [] : ["location"],
      specialistNeed: "candidate",
      specialistDomains: ["Lighting"],
    },
    clara: { summary: "Qualification", nextAction: "Poursuivre la qualification.", confidence: 0.9 },
    governance: { owner: "clara-os", humanApproval: "required-for-committing-actions" },
  };
}

function brief(required: boolean): AcquisitionDecisionBrief {
  return {
    schema: "clara.acquisition-decision-brief.v1",
    submissionId: "submission-123",
    headline: "Qualification",
    understood: [],
    missing: [],
    claraCanContinue: [],
    proposedSpecialistReview: ["Lighting"],
    decision: {
      required,
      kind: required ? "review-specialist-routing" : "review-missing-information",
      question: required ? "Valider l'expertise." : "Clara poursuit.",
    },
  };
}

describe("Acquisition lifecycle", () => {
  it("starts received and keeps working while information is missing", () => {
    const initial = initialAcquisitionLifecycle("submission-123");
    const next = advanceAcquisitionLifecycle(initial, {
      type: "qualification-updated",
      qualification: qualification("needs-information"),
      brief: brief(false),
    });

    expect(next.state).toBe("qualifying");
    expect(next.decisionRequired).toBe(false);
  });

  it("stops at a decision boundary when qualification is ready", () => {
    const initial = initialAcquisitionLifecycle("submission-123");
    const next = advanceAcquisitionLifecycle(initial, {
      type: "qualification-updated",
      qualification: qualification("ready"),
      brief: brief(true),
    });

    expect(next.state).toBe("decision-required");
    expect(next.decisionRequired).toBe(true);
  });

  it("continues to specialist review only after operator approval", () => {
    const current = {
      ...initialAcquisitionLifecycle("submission-123"),
      state: "decision-required" as const,
      decisionRequired: true,
    };
    const next = advanceAcquisitionLifecycle(current, { type: "operator-approved-specialist" });

    expect(next.state).toBe("specialist-review");
    expect(next.decisionRequired).toBe(false);
  });

  it("returns to a decision boundary after specialist review", () => {
    const current = {
      ...initialAcquisitionLifecycle("submission-123"),
      state: "specialist-review" as const,
    };
    const next = advanceAcquisitionLifecycle(current, { type: "specialist-review-completed" });

    expect(next.state).toBe("decision-required");
    expect(next.decisionRequired).toBe(true);
  });

  it("requires validation before a prepared proposal can be sent", () => {
    const current = {
      ...initialAcquisitionLifecycle("submission-123"),
      state: "proposal-preparation" as const,
    };
    const next = advanceAcquisitionLifecycle(current, { type: "proposal-prepared" });

    expect(next.state).toBe("decision-required");
    expect(next.decisionRequired).toBe(true);
  });
});
