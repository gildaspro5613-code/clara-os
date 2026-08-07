/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Stage.tsx
 * Responsibility :
 * Official cockpit composition.
 *
 * Reproduces cockpit_master.png.
 * No business logic.
 * ============================================
 */

import AttentionPanel from "@/components/cockpit/panels/AttentionPanel";
import SummaryPanel from "@/components/cockpit/panels/SummaryPanel";
import TodayPanel from "@/components/cockpit/panels/TodayPanel";
import ConversationsPanel from "@/components/cockpit/panels/ConversationsPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
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
  .stage-enter-1 { animation-delay:   0ms; }
  .stage-enter-2 { animation-delay: 120ms; }
  .stage-enter-3 { animation-delay: 240ms; }
  .stage-enter-4 { animation-delay: 360ms; }
  .stage-enter-5 { animation-delay: 480ms; }
  .stage-enter-6 { animation-delay: 600ms; }
`;

/**
 * Presentation-only stage.
 *
 * Layout mirrors the official maquette:
 *
 *   LEFT  |  [Clara]  |  RIGHT
 *   ------+-----------+------
 *   Attention         Résumé
 *   Aujourd'hui       Conversations
 *   À faire           Raccourcis
 *
 * Panels sit near their respective edges; Clara occupies the centre.
 * Z-index order: Background → Clara (z-20) → Panels (z-30) → Header.
 */
export default function Stage() {
  return (
    <>
      <style>{stageStyles}</style>

      {/* Panels layer — above Clara (z-20), below Header */}
      <div className="pointer-events-none absolute inset-0 z-30">

        {/* ── LEFT COLUMN ────────────────────────────────────── */}
        <div
          className="absolute top-0 bottom-0 flex flex-col justify-center gap-4 px-6"
          style={{ left: 0, width: "22%" }}
        >
          <div className="stage-enter stage-enter-1 pointer-events-auto">
            <AttentionPanel />
          </div>
          <div className="stage-enter stage-enter-3 pointer-events-auto">
            <TodayPanel />
          </div>
          <div className="stage-enter stage-enter-5 pointer-events-auto">
            <TasksPanel />
          </div>
        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────── */}
        <div
          className="absolute top-0 bottom-0 flex flex-col justify-center gap-4 px-6"
          style={{ right: 0, width: "22%" }}
        >
          <div className="stage-enter stage-enter-2 pointer-events-auto">
            <SummaryPanel />
          </div>
          <div className="stage-enter stage-enter-4 pointer-events-auto">
            <ConversationsPanel />
          </div>
          <div className="stage-enter stage-enter-6 pointer-events-auto">
            <QuickActionsPanel />
          </div>
        </div>

      </div>
    </>
  );
}
