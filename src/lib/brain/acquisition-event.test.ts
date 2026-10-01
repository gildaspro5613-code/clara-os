import { describe, expect, it } from "vitest";

import { EventType, type Event } from "@/types";
import { acquisitionLocale, extractAcquisitionInput } from "./acquisition-event";
import { buildContext } from "./context";

function projectEvent(): Event {
  return {
    id: "event-1",
    type: EventType.PROJECT_INTAKE_RECEIVED,
    source: "melodie-digital-site",
    timestamp: new Date("2026-09-30T03:00:00.000Z"),
    payload: {
      schema: "md.project-intake.v1",
      submissionId: "submission-123",
      source: {
        system: "melodie-digital-site",
        channel: "website",
        locale: "en",
      },
      contact: {
        name: "Touring Production",
        email: "production@example.com",
      },
      request: {
        projectType: "Spectacle / tournée",
        disciplines: ["Lighting", "Sound"],
        location: "London, UK",
        schedule: "Spring 2027",
        brief: "Prepare the technical production for an international tour.",
      },
      orchestration: {
        owner: "clara-os",
        specialistRouting: "clara-os-decides",
        humanApproval: "required-for-committing-actions",
      },
    },
    context: {
      metadata: {
        locale: "en",
        schema: "md.project-intake.v1",
      },
    },
  };
}

describe("Project acquisition Brain input", () => {
  it("turns a project intake into useful qualification context", () => {
    const input = extractAcquisitionInput(buildContext(projectEvent()));

    expect(input).toContain("NOUVELLE DEMANDE PROJET À QUALIFIER");
    expect(input).toContain("submission-123");
    expect(input).toContain("Lighting, Sound");
    expect(input).toContain("London, UK");
    expect(input).toContain("international tour");
    expect(input).toContain("gouvernance");
  });

  it("preserves a supported acquisition locale", () => {
    expect(acquisitionLocale(projectEvent())).toBe("en");
  });

  it("falls back to French for an unsupported locale", () => {
    const event = projectEvent();
    event.context = { metadata: { locale: "nl" } };
    expect(acquisitionLocale(event)).toBe("fr");
  });

  it("ignores unrelated events", () => {
    const event = projectEvent();
    event.type = EventType.SYSTEM;
    expect(extractAcquisitionInput(buildContext(event))).toBeNull();
  });
});
