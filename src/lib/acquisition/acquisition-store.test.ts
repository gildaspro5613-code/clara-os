import { describe, expect, it, vi } from "vitest";

const sql = vi.fn();
vi.mock("@/lib/core/store/database", () => ({ sql }));

describe("Acquisition store contract", () => {
  it("keeps persistence keyed by workspace and submission", async () => {
    sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { saveAcquisitionRecord } = await import("./acquisition-store");
    await saveAcquisitionRecord({
      workspaceId: "melodie-digital",
      qualification: {
        schema: "clara.acquisition-qualification.v1",
        submissionId: "submission-123",
        source: { system: "melodie-digital-site", channel: "website", locale: "fr" },
        opportunity: { projectType: "Spectacle", disciplines: [], location: null, schedule: null, brief: "Brief" },
        qualification: { completeness: "needs-information", acquired: ["projectType", "brief"], missing: ["location"], specialistNeed: "not-indicated", specialistDomains: [] },
        clara: { summary: "Qualification", nextAction: "Compléter le lieu.", confidence: 0.8 },
        governance: { owner: "clara-os", humanApproval: "required-for-committing-actions" },
      },
      decisionBrief: {
        schema: "clara.acquisition-decision-brief.v1",
        submissionId: "submission-123",
        headline: "Qualification",
        understood: ["Type : Spectacle"],
        missing: ["location"],
        claraCanContinue: ["Préparer les questions."],
        proposedSpecialistReview: [],
        decision: { required: false, kind: "review-missing-information", question: "Clara poursuit." },
      },
      lifecycle: {
        schema: "clara.acquisition-lifecycle.v1",
        submissionId: "submission-123",
        state: "qualifying",
        nextAction: "Compléter le lieu.",
        decisionRequired: false,
        updatedAt: "2026-09-30T03:00:00.000Z",
      },
    });

    expect(sql).toHaveBeenCalledTimes(2);
  });
});
