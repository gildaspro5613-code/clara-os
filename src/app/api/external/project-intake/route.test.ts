import { describe, expect, it } from "vitest";

import { receiveMdProjectIntake } from "@/lib/intake/md-project-intake";
import { EventType } from "@/types";

const validIntake = {
  schema: "md.project-intake.v1" as const,
  source: {
    system: "melodie-digital-site" as const,
    channel: "website" as const,
    locale: "fr",
  },
  contact: {
    name: "Test Project",
    email: "project@example.com",
  },
  request: {
    projectType: "live-event",
    disciplines: ["lighting", "sound"],
    location: "Paris",
    schedule: "2026",
    brief: "Préparer la production technique du projet.",
  },
  orchestration: {
    owner: "clara-os" as const,
    initialState: "received" as const,
    specialistRouting: "clara-os-decides" as const,
    humanApproval: "required-for-committing-actions" as const,
  },
  receivedAt: "2026-09-28T20:00:00.000Z",
};

describe("Mélodie Digital project intake boundary", () => {
  it("converts the website contract into the dedicated Clara event", () => {
    const result = receiveMdProjectIntake(validIntake);

    expect(result.event.type).toBe(EventType.PROJECT_INTAKE_RECEIVED);
    expect(result.event.source).toBe("melodie-digital-site");
    expect(result.event.payload).toEqual(validIntake);
    expect(result.event.context?.metadata).toMatchObject({
      schema: "md.project-intake.v1",
      channel: "website",
      locale: "fr",
    });
  });

  it("rejects a payload that does not respect the MD intake contract", () => {
    expect(() => receiveMdProjectIntake({
      ...validIntake,
      source: { ...validIntake.source, system: "unknown-site" },
    })).toThrow("INVALID_MD_PROJECT_INTAKE");
  });
});
