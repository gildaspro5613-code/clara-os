/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : TodayPanel.tsx
 * Responsibility :
 * Displays today's schedule.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function TodayPanel() {
  return (
    <GlassPanel
      title="Aujourd'hui"
      className="h-full w-full border-white/12 bg-black/28 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <div>
            <p className="font-semibold">
              Développement Clara OS
            </p>

            <p className="mt-1 text-sm text-white/70">
              Continuer l'assemblage du cockpit V1.
            </p>

            <p className="mt-2 text-xs text-white/45">
              09:30 — En cours
            </p>
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-start gap-3">
          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div>
            <p className="font-semibold">
              Validation de l'interface
            </p>

            <p className="mt-1 text-sm text-white/70">
              Vérifier le placement de Clara et des panneaux.
            </p>

            <p className="mt-2 text-xs text-white/45">
              Cet après-midi
            </p>
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-start gap-3">
          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-violet-400" />
          <div>
            <p className="font-semibold">
              Préparer le Life Engine
            </p>

            <p className="mt-1 text-sm text-white/70">
              Une fois le cockpit validé.
            </p>

            <p className="mt-2 text-xs text-white/45">
              Prochaine étape
            </p>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}