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
    <GlassPanel className="w-[13rem] px-5 py-4 bg-white/[0.025] border-white/[0.06] shadow-[0_2px_14px_rgba(0,0,0,0.14)]">
      <h3 className="mb-3 text-sm font-medium tracking-[0.08em] uppercase text-white/74">
        Actions
      </h3>

      <ul className="space-y-2">
        <li>
          <button
            type="button"
            className="w-full text-left text-sm text-white/80 hover:text-white/95 transition-colors"
          >
            Démarrer le brief
          </button>
        </li>
        <li>
          <button
            type="button"
            className="w-full text-left text-sm text-white/80 hover:text-white/95 transition-colors"
          >
            Voir l&rsquo;agenda
          </button>
        </li>
        <li>
          <button
            type="button"
            className="w-full text-left text-sm text-white/80 hover:text-white/95 transition-colors"
          >
            Ouvrir les missions
          </button>
        </li>
      </ul>
    </GlassPanel>
  );
}
