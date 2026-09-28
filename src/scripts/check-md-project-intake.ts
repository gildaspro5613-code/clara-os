import assert from "node:assert/strict";
import { receiveMdProjectIntake } from "@/lib/intake/md-project-intake";
import { EventType } from "@/types";

const result = receiveMdProjectIntake({
  schema: "md.project-intake.v1",
  source: {
    system: "melodie-digital-site",
    channel: "website",
    locale: "fr",
  },
  contact: {
    name: "Test Project",
    email: "project@example.com",
  },
  request: {
    projectType: "Événement",
    disciplines: ["Lighting", "Sound"],
    location: "France",
    schedule: "À définir",
    brief: "Préparer la production technique d'un événement de démonstration.",
  },
  orchestration: {
    owner: "clara-os",
    initialState: "received",
    specialistRouting: "clara-os-decides",
    humanApproval: "required-for-committing-actions",
  },
  receivedAt: "2026-09-28T10:00:00.000Z",
});

assert.equal(result.event.type, EventType.PROJECT_INTAKE_RECEIVED);
assert.equal(result.event.source, "melodie-digital-site");
assert.equal(result.event.payload, result.intake);
assert.equal(result.event.context?.metadata?.schema, "md.project-intake.v1");
assert.equal(result.intake.orchestration.owner, "clara-os");
assert.equal(result.intake.orchestration.specialistRouting, "clara-os-decides");

console.log("MD project intake boundary: OK");
