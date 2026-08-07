/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : TasksPanel.tsx
 * Responsibility :
 * Displays Clara's current priority task,
 * matching cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/** TasksPanel — ✓ À FAIRE MAINTENANT with a single task and CTA. */
export default function TasksPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>✓</span>
        <span>À faire maintenant</span>
      </div>

      <p className="mb-4 text-sm leading-snug text-white/85">
        Finaliser le Life Engine de Clara.
      </p>

      <button
        type="button"
        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5"
      >
        Commencer &rarr;
      </button>
    </GlassPanel>
  );
}
