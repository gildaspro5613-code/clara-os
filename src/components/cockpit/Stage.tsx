/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Stage.tsx
 * Responsibility :
 * Visual stage composition for the Hero.
 * Positions overlay panels above the cockpit.
 * ============================================
 */

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import GlassPanel from "@/components/ui/GlassPanel";

/**
 * Presentation-only Hero stage.
 * Arranges floating panels with absolute positioning.
 */
export default function Stage() {
  return (
    <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
      <div className="w-full max-w-sm mx-6 sm:mx-10 md:mr-16 lg:mr-24 flex flex-col items-start">
        <BriefPanel />

        <AgendaPanel />

        <GlassPanel className="mt-5 ml-6 h-24 w-[12.25rem] bg-white/[0.028] border-white/[0.065] shadow-[0_2px_14px_rgba(0,0,0,0.15)]">
          <div aria-hidden="true" className="h-full w-full" />
        </GlassPanel>
      </div>
    </div>
  );
}
