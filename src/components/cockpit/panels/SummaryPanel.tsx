/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : SummaryPanel.tsx
 * Responsibility :
 * Displays Clara's daily summary stats and
 * global progress, matching cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/** SummaryPanel — ↗ RÉSUMÉ DU JOUR with stats and progress bar. */
export default function SummaryPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>↗</span>
        <span>Résumé du jour</span>
      </div>

      <ul className="mb-4 space-y-1.5">
        <li className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-sm font-semibold text-white/90">3</span>
          <span className="text-sm text-white/70">Missions en cours</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-sm font-semibold text-white/90">7</span>
          <span className="text-sm text-white/70">Tâches planifiées</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-sm font-semibold text-white/90">2</span>
          <span className="text-sm text-white/70">Appels programmés</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-sm font-semibold text-white/90">5</span>
          <span className="text-sm text-white/70">Automatisations actives</span>
        </li>
      </ul>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-white/60">Progression globale</span>
          <span className="text-xs font-semibold text-white/80">72%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-amber-400" />
        </div>
      </div>
    </GlassPanel>
  );
}
