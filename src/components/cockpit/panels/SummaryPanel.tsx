/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : SummaryPanel.tsx
 * Responsibility :
 * Displays Clara's daily summary.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function SummaryPanel() {
  return (
    <GlassPanel title="Résumé du jour">
      <div className="space-y-5">

        <div className="flex items-center justify-between">
          <span className="text-white/70">Tâches terminées</span>
          <span className="font-semibold">12</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">Conversations</span>
          <span className="font-semibold">18</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">Automatisations</span>
          <span className="font-semibold">7</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <p className="text-xs uppercase tracking-[0.20em] text-white/50">
            Aujourd'hui
          </p>

          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Belle progression. Le cockpit est presque finalisé et Clara poursuit
            l'assemblage des derniers éléments de l'interface.
          </p>

        </div>

      </div>
    </GlassPanel>
  );
}