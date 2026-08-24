/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : TasksPanel.tsx
 * Responsibility :
 * Displays Clara's current mission.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function TasksPanel() {
  return (
    <GlassPanel title="À faire maintenant">
      <div className="space-y-6">

        <div>
          <p className="text-lg font-semibold">
            Finaliser le cockpit Clara OS
          </p>

          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Clara poursuit l'intégration des derniers éléments de l'interface.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/60">
              Progression
            </span>

            <span className="text-sm font-semibold">
              82 %
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[82%] rounded-full bg-cyan-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <p className="text-xs uppercase tracking-[0.20em] text-white/50">
            Étape suivante
          </p>

          <p className="mt-2 font-medium">
            Assembler le Stage et positionner Clara.
          </p>

        </div>

      </div>
    </GlassPanel>
  );
}