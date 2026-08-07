/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ActionsPanel.tsx
 * Responsibility :
 * Displays Clara's primary recommended action.
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function ActionsPanel() {
  return (
    <GlassPanel className="max-w-[15rem] px-6 py-5 bg-white/[0.035] border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.18)]">
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
