/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Stage.tsx
 * Responsibility :
 * Visual stage composition for the Hero.
 * Positions overlay panels above the cockpit
 * using absolute positioning to reproduce the
 * official cockpit_master.png reference layout.
 * ============================================
 */

import AttentionPanel from "@/components/cockpit/panels/AttentionPanel";
import TodayPanel from "@/components/cockpit/panels/TodayPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import SummaryPanel from "@/components/cockpit/panels/SummaryPanel";
import ConversationsPanel from "@/components/cockpit/panels/ConversationsPanel";
import QuickActionsPanel from "@/components/cockpit/panels/QuickActionsPanel";

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
  .stage-enter-2 { animation-delay: 120ms; }
  .stage-enter-3 { animation-delay: 240ms; }
  .stage-enter-4 { animation-delay: 60ms; }
  .stage-enter-5 { animation-delay: 180ms; }
  .stage-enter-6 { animation-delay: 300ms; }
  .stage-enter-7 { animation-delay: 420ms; }
`;

/**
 * Presentation-only Hero stage.
 *
 * All panels are positioned with absolute coordinates derived from
 * docs/design/cockpit_master.png (hero artboard 1110 × 780 px, excluding sidebar).
 *
 * Left column  – 50 % from left, 24 % wide: AttentionPanel · TodayPanel · TasksPanel
 * Right column – 75 % from left, 21 % wide: SummaryPanel  · ConversationsPanel · QuickActionsPanel
 * Bottom bar   – centered, 46 % wide
 */
export default function Stage() {
  return (
    <>
      <style>{stageStyles}</style>
      <div className="absolute inset-0 pointer-events-none z-30">

        {/* Left column: ATTENTION · AUJOURD'HUI · À FAIRE MAINTENANT */}
        <div
          className="absolute flex flex-col gap-3"
          style={{ top: "8%", left: "50%", width: "24%", maxWidth: "290px" }}
        >
          <div className="stage-enter stage-enter-1">
            <AttentionPanel />
          </div>
          <div className="stage-enter stage-enter-2">
            <TodayPanel />
          </div>
          <div className="stage-enter stage-enter-3">
            <TasksPanel />
          </div>
        </div>

        {/* Right column: RÉSUMÉ DU JOUR · DERNIÈRES CONVERSATIONS · RACCOURCIS RAPIDES */}
        <div
          className="absolute flex flex-col gap-3"
          style={{ top: "8%", left: "75%", width: "21%", maxWidth: "260px" }}
        >
          <div className="stage-enter stage-enter-4">
            <SummaryPanel />
          </div>
          <div className="stage-enter stage-enter-5">
            <ConversationsPanel />
          </div>
          <div className="stage-enter stage-enter-6">
            <QuickActionsPanel />
          </div>
        </div>

        {/* Bottom status bar */}
        <div
          className="absolute stage-enter stage-enter-7"
          style={{ bottom: "3%", left: "27%", width: "46%" }}
        >
          <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-[28px]">
            <span className="shrink-0 text-lg text-white/60">✦</span>
            <div>
              <p className="text-sm font-medium text-white/90">
                Clara est prête à vous accompagner
              </p>
              <p className="text-xs text-white/55">
                Que souhaitez-vous accomplir aujourd&rsquo;hui&nbsp;?
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
