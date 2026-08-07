/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : QuickActionsPanel.tsx
 * Responsibility :
 * Displays Clara's most frequently used actions.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function QuickActionsPanel() {
  const actions = [
    "Nouvelle mission",
    "Agenda",
    "Appeler",
    "Notes",
    "Brain",
    "Automatisations",
  ];

  return (
    <GlassPanel
      title="Raccourcis rapides"
      className="h-full w-full border-white/12 bg-black/28 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]"
    >
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            type="button"
            key={action}
            className="
              h-14
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-4
              py-4
              text-sm
              font-medium
              text-white/90
              transition-all
              duration-200
              hover:bg-white/10
              hover:border-white/20
              hover:scale-[1.02]
              active:scale-[0.98]
            "
          >
            {action}
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}