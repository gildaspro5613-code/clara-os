import { describe, expect, it } from "vitest";

import type { AcquisitionQualification } from "./qualification";
import { buildAcquisitionDecisionBrief } from "./decision-brief";

function qualification(): AcquisitionQualification {
  return {
    schema: "clara.acquisition-qualification.v1",
    submissionId: "submission-123",
    source: { system: "melodie-digital-site", channel: "website", locale: "fr" },
    opportunity: {
      projectType: "Spectacle / tournée",
      disciplines: ["Lighting", "Sound"],
      location: "Paris, France",
      schedule: "Printemps 2027",
      brief: "Préparer une tournée internationale.",
    },
    qualification: {
      completeness: "ready",
      acquired: ["projectType", "brief", "contactEmail", "disciplines", "location", "schedule", "contactName"],
      missing: [],
      specialistNeed: "candidate",
      specialistDomains: ["Lighting", "Sound"],
    },
    clara: {
      summary: "La demande est suffisamment structurée pour poursuivre.",
      nextAction: "Préparer l'expertise technique.",
      confidence: 0.9,
    },
    governance: {
      owner: "clara-os",
      humanApproval: "required-for-committing-actions",
    },
  };
}

describe("Acquisition decision brief", () => {
  it("asks for no operator decision while Clara can still collect missing information", () => {
    const value = qualification();
    value.qualification.completeness = "needs-information";
    value.qualification.missing = ["location"];

    const brief = buildAcquisitionDecisionBrief(value);

    expect(brief.decision.required).toBe(false);
    expect(brief.decision.kind).toBe("review-missing-information");
    expect(brief.missing).toEqual(["location"]);
    expect(brief.claraCanContinue.length).toBeGreaterThan(0);
  });

  it("surfaces specialist routing as a decision when qualification is ready", () => {
    const brief = buildAcquisitionDecisionBrief(qualification());

    expect(brief.decision.required).toBe(true);
    expect(brief.decision.kind).toBe("review-specialist-routing");
    expect(brief.proposedSpecialistReview).toEqual(["Lighting", "Sound"]);
  });

  it("surfaces the qualified opportunity when no specialist is indicated", () => {
    const value = qualification();
    value.qualification.specialistNeed = "not-indicated";
    value.qualification.specialistDomains = [];

    const brief = buildAcquisitionDecisionBrief(value);

    expect(brief.decision.required).toBe(true);
    expect(brief.decision.kind).toBe("review-opportunity");
    expect(brief.proposedSpecialistReview).toEqual([]);
  });
});
