import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAcquisitionRecord = vi.fn();
const saveAcquisitionRecord = vi.fn();

vi.mock("./acquisition-store", () => ({
  loadAcquisitionRecord,
  saveAcquisitionRecord,
}));

describe("Acquisition operator decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAcquisitionRecord.mockResolvedValue({
      submissionId: "submission-123",
      workspaceId: "melodie-digital",
      qualification: {},
      decisionBrief: {},
      lifecycle: {
        schema: "clara.acquisition-lifecycle.v1",
        submissionId: "submission-123",
        state: "decision-required",
        nextAction: "Décider.",
        decisionRequired: true,
        updatedAt: "2026-09-30T03:00:00.000Z",
      },
      createdAt: new Date("2026-09-30T03:00:00.000Z"),
      updatedAt: new Date("2026-09-30T03:00:00.000Z"),
    });
    saveAcquisitionRecord.mockResolvedValue(undefined);
  });

  it("resumes specialist work after explicit approval", async () => {
    const { applyAcquisitionOperatorDecision } = await import("./operator-decision");
    const result = await applyAcquisitionOperatorDecision({
      workspaceId: "melodie-digital",
      submissionId: "submission-123",
      decision: "approve-specialist",
      now: new Date("2026-09-30T04:00:00.000Z"),
    });

    expect(result?.resumed).toBe(true);
    expect(result?.record.lifecycle.state).toBe("specialist-review");
    expect(saveAcquisitionRecord).toHaveBeenCalledOnce();
  });

  it("defers without mutating the dossier", async () => {
    const { applyAcquisitionOperatorDecision } = await import("./operator-decision");
    const result = await applyAcquisitionOperatorDecision({
      workspaceId: "melodie-digital",
      submissionId: "submission-123",
      decision: "defer",
    });

    expect(result?.resumed).toBe(false);
    expect(saveAcquisitionRecord).not.toHaveBeenCalled();
  });

  it("closes a rejected opportunity", async () => {
    const { applyAcquisitionOperatorDecision } = await import("./operator-decision");
    const result = await applyAcquisitionOperatorDecision({
      workspaceId: "melodie-digital",
      submissionId: "submission-123",
      decision: "reject",
    });

    expect(result?.resumed).toBe(false);
    expect(result?.record.lifecycle.state).toBe("closed");
  });

  it("refuses a decision outside a decision boundary", async () => {
    loadAcquisitionRecord.mockResolvedValueOnce({
      submissionId: "submission-123",
      workspaceId: "melodie-digital",
      qualification: {},
      decisionBrief: {},
      lifecycle: {
        schema: "clara.acquisition-lifecycle.v1",
        submissionId: "submission-123",
        state: "qualifying",
        nextAction: "Qualifier.",
        decisionRequired: false,
        updatedAt: "2026-09-30T03:00:00.000Z",
      },
      createdAt: new Date("2026-09-30T03:00:00.000Z"),
      updatedAt: new Date("2026-09-30T03:00:00.000Z"),
    });

    const { applyAcquisitionOperatorDecision } = await import("./operator-decision");
    await expect(applyAcquisitionOperatorDecision({
      workspaceId: "melodie-digital",
      submissionId: "submission-123",
      decision: "approve-opportunity",
    })).rejects.toThrow("Acquisition decision is not currently required.");
  });
});
