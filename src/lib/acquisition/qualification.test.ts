import { describe, expect, it } from "vitest";

import type { MdProjectIntake, Understanding } from "@/types";
import { qualifyProjectIntake } from "./qualification";

const intake: MdProjectIntake = {
  schema: "md.project-intake.v1",
  submissionId: "submission-123",
  source: {
    system: "melodie-digital-site",
    channel: "website",
    locale: "fr",
  },
  contact: {
    name: "Production Test",
    email: "production@example.com",
  },
  request: {
    projectType: "Spectacle / tournée",
    disciplines: ["Lighting", "Sound"],
    location: "",
    schedule: "Printemps 2027",
    brief: "Préparer la production technique d'une tournée internationale.",
  },
  orchestration: {
    owner: "clara-os",
    initialState: "received",
    specialistRouting: "clara-os-decides",
    humanApproval: "required-for-committing-actions",
  },
  receivedAt: "2026-09-30T03:00:00.000Z",
};

const understanding: Understanding = {
  intent: "Qualifier la demande de tournée",
  summary: "La demande couvre une préparation technique lumière et son.",
  confidence: 0.9,
  entities: ["Lighting", "Sound"],
  actions: ["Identifier les informations manquantes"],
  nextAction: "Obtenir le lieu ou l'itinéraire de la tournée.",
  importance: 0.8,
  urgency: 0.5,
  impact: 0.8,
};

describe("Acquisition qualification", () => {
  it("separates acquired and missing information without inventing data", () => {
    const result = qualifyProjectIntake(intake, understanding);

    expect(result.schema).toBe("clara.acquisition-qualification.v1");
    expect(result.submissionId).toBe("submission-123");
    expect(result.qualification.completeness).toBe("needs-information");
    expect(result.qualification.acquired).toContain("schedule");
    expect(result.qualification.missing).toEqual(["location"]);
    expect(result.opportunity.location).toBeNull();
  });

  it("marks declared disciplines as specialist candidates without routing them", () => {
    const result = qualifyProjectIntake(intake, understanding);

    expect(result.qualification.specialistNeed).toBe("candidate");
    expect(result.qualification.specialistDomains).toEqual(["Lighting", "Sound"]);
    expect(result.governance.humanApproval).toBe("required-for-committing-actions");
  });

  it("becomes ready when the intake contains the qualification essentials", () => {
    const result = qualifyProjectIntake({
      ...intake,
      request: { ...intake.request, location: "Paris, France" },
    }, understanding);

    expect(result.qualification.completeness).toBe("ready");
    expect(result.qualification.missing).toEqual([]);
  });
});
