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
import ConversationsPanel from "@/components/cockpit/panels/ConversationsPanel";
import QuickActionsPanel from "@/components/cockpit/panels/QuickActionsPanel";
import SummaryPanel from "@/components/cockpit/panels/SummaryPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import TodayPanel from "@/components/cockpit/panels/TodayPanel";

const ARTBOARD_WIDTH = 1536;
const ARTBOARD_HEIGHT = 1024;

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
  .stage-enter-4 { animation-delay: 360ms; }
  .stage-enter-5 { animation-delay: 480ms; }
  .stage-enter-6 { animation-delay: 600ms; }
`;

const panelFrames = {
  attention: {
    left: 88,
    top: 108,
    width: 320,
    height: 196,
  },
  today: {
    left: 88,
    top: 334,
    width: 320,
    height: 254,
  },
  tasks: {
    left: 88,
    top: 618,
    width: 320,
    height: 214,
  },
  summary: {
    left: 1128,
    top: 108,
    width: 320,
    height: 196,
  },
  conversations: {
    left: 1128,
    top: 334,
    width: 320,
    height: 254,
  },
  quickActions: {
    left: 1128,
    top: 618,
    width: 320,
    height: 214,
  },
} as const;

function getPanelStyle(frame: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return {
    left: `${(frame.left / ARTBOARD_WIDTH) * 100}%`,
    top: `${(frame.top / ARTBOARD_HEIGHT) * 100}%`,
    width: `${(frame.width / ARTBOARD_WIDTH) * 100}%`,
    height: `${(frame.height / ARTBOARD_HEIGHT) * 100}%`,
  };
}

/**
 * Presentation-only Hero stage.
 * Arranges floating panels with absolute positioning.
 * Panels enter sequentially via CSS-only staged animations.
 */
export default function Stage() {
  return (
    <>
      <style>{stageStyles}</style>

      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "max(100vw, calc(100vh * 1.5))",
            height: "max(100vh, calc(100vw / 1.5))",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="stage-enter stage-enter-1 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.attention)}
          >
            <AttentionPanel />
          </div>

          <div
            className="stage-enter stage-enter-2 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.today)}
          >
            <TodayPanel />
          </div>

          <div
            className="stage-enter stage-enter-3 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.tasks)}
          >
            <TasksPanel />
          </div>

          <div
            className="stage-enter stage-enter-4 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.summary)}
          >
            <SummaryPanel />
          </div>

          <div
            className="stage-enter stage-enter-5 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.conversations)}
          >
            <ConversationsPanel />
          </div>

          <div
            className="stage-enter stage-enter-6 absolute pointer-events-auto"
            style={getPanelStyle(panelFrames.quickActions)}
          >
            <QuickActionsPanel />
          </div>
        </div>
      </div>
    </>
  );
}
