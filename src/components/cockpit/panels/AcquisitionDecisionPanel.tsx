"use client";

import { useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import type { AcquisitionOperatorDecision } from "@/lib/acquisition/operator-decision";

interface AcquisitionDecisionPanelProps {
  initialDecisions: AcquisitionRecord[];
}

export default function AcquisitionDecisionPanel({
  initialDecisions,
}: AcquisitionDecisionPanelProps) {
  const [decisions, setDecisions] = useState(initialDecisions);
  const [busy, setBusy] = useState<string | null>(null);
  const current = decisions[0];

  if (!current) return null;

  async function decide(decision: AcquisitionOperatorDecision) {
    setBusy(decision);
    try {
      const response = await fetch("/api/clara/acquisition/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: current.submissionId, decision }),
      });
      if (!response.ok) return;
      if (decision === "defer") return;
      setDecisions((items) => items.filter((item) => item.submissionId !== current.submissionId));
    } finally {
      setBusy(null);
    }
  }

  const specialistDecision = current.decisionBrief.decision.kind === "review-specialist-routing";

  return (
    <GlassPanel title="Décision demandée par Clara">
      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold leading-snug text-white/95">
            {current.decisionBrief.headline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {current.decisionBrief.decision.question}
          </p>
        </div>

        {current.decisionBrief.proposedSpecialistReview.length > 0 && (
          <p className="text-sm text-white/70">
            Expertise proposée : {current.decisionBrief.proposedSpecialistReview.join(", ")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide(specialistDecision ? "approve-specialist" : "approve-opportunity")}
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50"
          >
            Valider
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide("defer")}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 disabled:opacity-50"
          >
            Plus tard
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide("reject")}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/55 transition hover:bg-white/5 disabled:opacity-50"
          >
            Refuser
          </button>
        </div>

        {decisions.length > 1 && (
          <p className="text-xs text-white/45">
            {decisions.length - 1} autre{decisions.length > 2 ? "s" : ""} décision{decisions.length > 2 ? "s" : ""} en attente.
          </p>
        )}
      </div>
    </GlassPanel>
  );
}
