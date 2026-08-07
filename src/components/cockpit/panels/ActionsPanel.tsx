/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ActionsPanel.tsx
 * Responsibility :
 * Presentational quick-actions panel displayed in
 * the cockpit hero section.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/**
 * ActionsPanel displays the primary quick-action
 * buttons inside the shared glass surface.
 */
export default function ActionsPanel() {
  return (
    <GlassPanel className="h-full w-full border-white/12 bg-black/28 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
        À faire maintenant
      </p>

      <p className="mb-5 text-sm leading-relaxed text-white/88">
        Finaliser le Life Engine de Clara.
      </p>

      <button
        type="button"
        className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition-all duration-300 hover:border-white/30 hover:bg-white/5 hover:text-white"
      >
        Commencer →
      </button>
    </GlassPanel>
  );
}
