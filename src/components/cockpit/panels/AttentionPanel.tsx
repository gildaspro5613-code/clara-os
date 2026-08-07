/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : AttentionPanel.tsx
 * Responsibility :
 * Displays Clara's priority alert with action
 * buttons, matching cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/** AttentionPanel — ★ ATTENTION with two CTA buttons. */
export default function AttentionPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>★</span>
        <span>Attention</span>
      </div>

      <p className="mb-4 text-sm leading-snug text-white/85">
        Souhaitez-vous commencer votre journée&nbsp;?
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-amber-500/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
        >
          Oui, commencer
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
        >
          Plus tard
        </button>
      </div>
    </GlassPanel>
  );
}