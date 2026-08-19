/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : AgendaPanel.tsx
 * Responsibility :
 * Presentational agenda panel displayed in the
 * cockpit hero section.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/**
 * AgendaPanel displays today's schedule inside
 * the shared glass surface.
 */
export default function AgendaPanel() {
  return (
    <GlassPanel className="mt-7 ml-2 w-[13.5rem] px-5 py-4 bg-black/25 border-white/[0.08] shadow-[0_2px_16px_rgba(0,0,0,0.16)]">
      <h3 className="mb-3 text-sm font-medium tracking-[0.08em] uppercase text-white/74">
        Aujourd&apos;hui
      </h3>

      <ul className="space-y-2">
        <li className="flex items-baseline gap-3 text-white/78">
          <span className="text-xs font-medium tabular-nums text-white/66">09:00</span>
          <span className="text-sm">Préparation des priorités</span>
        </li>
        <li className="flex items-baseline gap-3 text-white/78">
          <span className="text-xs font-medium tabular-nums text-white/66">11:00</span>
          <span className="text-sm">Développement Clara OS</span>
        </li>
        <li className="flex items-baseline gap-3 text-white/78">
          <span className="text-xs font-medium tabular-nums text-white/66">15:00</span>
          <span className="text-sm">Revue des missions</span>
        </li>
      </ul>
    </GlassPanel>
  );
}
