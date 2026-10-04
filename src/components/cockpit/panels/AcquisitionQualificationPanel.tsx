import GlassPanel from "@/components/ui/GlassPanel";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { buildCommercialQualificationDraft } from "@/lib/acquisition/commercial-communication-draft";
import { loadProjectIntake } from "@/lib/intake/md-project-intake-inbox";

interface AcquisitionQualificationPanelProps {
  qualifications: AcquisitionRecord[];
}

export default async function AcquisitionQualificationPanel({
  qualifications,
}: AcquisitionQualificationPanelProps) {
  const current = qualifications[0];
  if (!current) return null;

  const opportunity = current.qualification.opportunity;
  const state = current.qualification.qualification;
  const intake = await loadProjectIntake(current.workspaceId, current.submissionId).catch(() => null);
  const draft = intake ? buildCommercialQualificationDraft(current, intake.intake) : null;

  return (
    <GlassPanel title="Qualification commerciale">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
            En qualification
          </span>
          <span className="text-xs text-white/45">{opportunity.projectType}</span>
          {opportunity.disciplines.length > 0 && (
            <span className="text-xs text-white/45">· {opportunity.disciplines.join(", ")}</span>
          )}
        </div>

        <div>
          <p className="text-base font-semibold leading-snug text-white/95">
            {current.decisionBrief.headline}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/65">
            {opportunity.brief}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-white/40">Calendrier</p>
            <p className="mt-1 text-sm text-white/80">{opportunity.schedule || "À confirmer"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-white/40">Lieu</p>
            <p className="mt-1 text-sm text-white/80">{opportunity.location || "À compléter"}</p>
          </div>
        </div>

        {state.missing.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200/70">Informations à compléter</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.missing.map((item) => (
                <span key={item} className="rounded-full border border-amber-200/20 bg-amber-200/5 px-3 py-1 text-xs text-amber-100/80">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
          <p className="text-xs uppercase tracking-wide text-cyan-100/55">Prochaine action Clara</p>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{current.lifecycle.nextAction}</p>
        </div>

        {draft && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/20 bg-amber-200/[0.04] p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-100/70">Communication commerciale prête</p>
              <p className="mt-1 text-sm text-white/65">
                Brouillon préparé pour {draft.recipient.name}. Clara attend votre validation avant toute action externe.
              </p>
            </div>
            <span className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100/80">
              Validation requise
            </span>
          </div>
        )}

        {qualifications.length > 1 && (
          <p className="text-xs text-white/40">
            {qualifications.length - 1} autre{qualifications.length > 2 ? "s" : ""} qualification{qualifications.length > 2 ? "s" : ""} active{qualifications.length > 2 ? "s" : ""}.
          </p>
        )}
      </div>
    </GlassPanel>
  );
}
