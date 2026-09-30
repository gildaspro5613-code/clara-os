import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventType } from "@/types";

const dispatchEvent = vi.fn();
const saveSession = vi.fn();

vi.mock("@/lib/core/clara", () => ({
  Clara: class Clara {
    constructor(
      public readonly sessionKey: string,
      public readonly workspaceId?: string,
    ) {}
  },
}));

vi.mock("@/lib/core/event-bus", () => ({ dispatchEvent }));
vi.mock("@/lib/core/store/session-store", () => ({ saveSession }));

import { POST, intakeSessionKey } from "./route";

const validIntake = {
  schema: "md.project-intake.v1" as const,
  submissionId: "submission-123",
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

function request(
  body: unknown,
  productId = "melodie-digital-site",
  token = "test-token",
) {
  return new Request("http://localhost/api/external/project-intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-clara-product": productId,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe("Mélodie Digital project intake HTTP boundary", () => {
  beforeEach(() => {
    process.env.CLARA_EXTERNAL_PRODUCTS_JSON = JSON.stringify({
      "melodie-digital-site": {
        workspaceId: "md-workspace",
        token: "test-token",
        capabilities: ["project-intake"],
      },
      "other-product": {
        workspaceId: "other-workspace",
        token: "other-token",
        capabilities: ["project-intake"],
      },
    });
    dispatchEvent.mockReset();
    saveSession.mockReset();
    dispatchEvent.mockResolvedValue({
      mission: { id: "mission-123" },
      updatedAt: new Date(),
    });
    saveSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
  });

  it("keeps the durable key stable across retries of one submission", () => {
    const first = intakeSessionKey(
      "melodie-digital-site",
      "md-workspace",
      "submission-123",
    );
    const retry = intakeSessionKey(
      "melodie-digital-site",
      "md-workspace",
      "submission-123",
    );
    const next = intakeSessionKey(
      "melodie-digital-site",
      "md-workspace",
      "submission-456",
    );

    expect(retry).toBe(first);
    expect(next).not.toBe(first);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await POST(new Request(
      "http://localhost/api/external/project-intake",
      { method: "POST", body: JSON.stringify(validIntake) },
    ));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ accepted: false });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid MD intake contract", async () => {
    const response = await POST(request({
      ...validIntake,
      submissionId: "",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      accepted: false,
      status: "invalid_project_intake",
    });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("rejects a product whose authenticated scope does not match the intake", async () => {
    const response = await POST(request(
      validIntake,
      "other-product",
      "other-token",
    ));

    expect(response.status).toBe(403);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("accepts only after Clara dispatch and persistence succeed", async () => {
    const response = await POST(request(validIntake));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      accepted: true,
      status: "accepted_by_clara_os",
      submissionId: "submission-123",
      missionId: "mission-123",
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    const event = dispatchEvent.mock.calls[0]?.[1];
    expect(event.type).toBe(EventType.PROJECT_INTAKE_RECEIVED);
    expect(saveSession).toHaveBeenCalledOnce();
  });

  it("does not acknowledge the intake when persistence fails", async () => {
    saveSession.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(request(validIntake));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      accepted: false,
      status: "clara_processing_failed",
    });
  });
});
