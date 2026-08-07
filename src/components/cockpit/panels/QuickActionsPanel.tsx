/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : QuickActionsPanel.tsx
 * Responsibility :
 * Displays Clara's most frequently used actions,
 * matching cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

const ACTIONS = [
  { icon: "+", label: "Créer une mission" },
  { icon: "✆", label: "Lancer un appel IA" },
  { icon: "⚙", label: "Nouvelle automatisation" },
  { icon: "◈", label: "Ouvrir le Brain" },
] as const;

/** QuickActionsPanel — ⚡ RACCOURCIS RAPIDES with four vertically listed actions. */
export default function QuickActionsPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>⚡</span>
        <span>Raccourcis rapides</span>
      </div>

      <ul className="space-y-2.5">
        {ACTIONS.map(({ icon, label }) => (
          <li key={label}>
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left text-sm text-white/80 transition-colors hover:text-white/95"
            >
              <span className="w-5 shrink-0 text-center text-base">{icon}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
