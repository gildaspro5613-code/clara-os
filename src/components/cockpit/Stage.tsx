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

import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ActionsPanel from "@/components/cockpit/panels/ActionsPanel";
import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";

const COCKPIT_CANVAS_RATIO = 1536 / 1024;

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
  .stage-enter-3 { animation-delay: 320ms; }
  .stage-enter-4 { animation-delay: 440ms; }
`;

const stageCanvasStyle = {
  width: `max(100vw, calc(100vh * ${COCKPIT_CANVAS_RATIO}))`,
  height: `max(100vh, calc(100vw / ${COCKPIT_CANVAS_RATIO}))`,
};

/**
 * Presentation-only Hero stage.
 * Arranges floating panels on the master artboard so their
 * composition stays aligned with Clara and the background.
 */
export default function Stage() {
  return (
    <>
      <style>{stageStyles}</style>

      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            ...stageCanvasStyle,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="stage-enter stage-enter-1 absolute"
            style={{
              top: "200px",
              left: "248px",
              width: "252px",
            }}
          >
            <BriefPanel />
          </div>

          <div
            className="stage-enter stage-enter-2 absolute"
            style={{
              top: "565px",
              left: "332px",
              width: "238px",
            }}
          >
            <AgendaPanel />
          </div>

          <div
            className="stage-enter stage-enter-3 absolute"
            style={{
              top: "352px",
              left: "1028px",
              width: "312px",
            }}
          >
            <TasksPanel />
          </div>

          <div
            className="stage-enter stage-enter-4 absolute"
            style={{
              top: "728px",
              left: "1088px",
              width: "208px",
            }}
          >
            <ActionsPanel />
          </div>
        </div>
      </div>
    </>
  );
}
