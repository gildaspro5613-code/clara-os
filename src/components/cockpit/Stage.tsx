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

const stageStyles = `
  @keyframes stage-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stage-enter {
    opacity: 0;
    animation: stage-fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .stage-enter-1 { animation-delay: 0ms; }
  .stage-enter-2 { animation-delay: 180ms; }
  .stage-enter-3 { animation-delay: 360ms; }
`;

/**
 * Presentation-only Hero stage.
 * Arranges floating panels with absolute positioning.
 * Panels enter sequentially via CSS-only staged animations.
 */
export default function Stage() {
  return (
    <>
      <style>{stageStyles}</style>
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <div className="w-full max-w-sm mx-6 sm:mx-10 md:mr-16 lg:mr-24 flex flex-col items-start">
          <div className="stage-enter stage-enter-1 w-full">
            <BriefPanel />
          </div>

          <div className="stage-enter stage-enter-2 w-full">
            <AgendaPanel />
          </div>

          <div className="stage-enter stage-enter-3">
            <GlassPanel className="mt-5 ml-6 h-24 w-[12.25rem] bg-white/[0.028] border-white/[0.065] shadow-[0_2px_14px_rgba(0,0,0,0.15)]">
              <div aria-hidden="true" className="h-full w-full" />
            </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
}
