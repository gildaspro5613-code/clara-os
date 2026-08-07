/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : TodayPanel.tsx
 * Responsibility :
 * Displays today's schedule, matching
 * cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/** TodayPanel — 📅 AUJOURD'HUI with time-slot list and agenda link. */
export default function TodayPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>📅</span>
        <span>Aujourd&rsquo;hui</span>
      </div>

      <ul className="mb-4 space-y-2">
        <li className="flex items-baseline gap-3">
          <span className="shrink-0 text-xs tabular-nums text-white/60">09:00</span>
          <span className="text-sm text-white/80">Préparation des priorités</span>
        </li>
        <li className="flex items-baseline gap-3">
          <span className="shrink-0 text-xs tabular-nums text-white/60">11:00</span>
          <span className="text-sm text-white/80">Développement Clara OS</span>
        </li>
        <li className="flex items-baseline gap-3">
          <span className="shrink-0 text-xs tabular-nums text-white/60">15:00</span>
          <span className="text-sm text-white/80">Revue des missions</span>
        </li>
      </ul>

      <button
        type="button"
        className="text-sm text-white/60 transition-colors hover:text-white/80"
      >
        Voir l&rsquo;agenda complet &rarr;
      </button>
    </GlassPanel>
  );
}