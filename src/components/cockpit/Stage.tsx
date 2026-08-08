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

import AttentionPanel from "@/components/cockpit/panels/AttentionPanel";
import TodayPanel from "@/components/cockpit/panels/TodayPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import SummaryPanel from "@/components/cockpit/panels/SummaryPanel";
import ConversationsPanel from "@/components/cockpit/panels/ConversationsPanel";
import QuickActionsPanel from "@/components/cockpit/panels/QuickActionsPanel";

const CLARA_READY_LABEL = "Clara est prête à vous accompagner";

/**
 * Fixed-artboard cockpit stage.
 * All floating panels and the bottom line are absolutely positioned
 * in a single shared 1536x1024 coordinate system.
 */
export default function Stage() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="pointer-events-auto absolute left-[92px] top-[98px] w-[342px]">
        <AttentionPanel />
      </div>
      <div className="pointer-events-auto absolute left-[92px] top-[352px] w-[342px]">
        <TodayPanel />
      </div>
      <div className="pointer-events-auto absolute left-[92px] top-[700px] w-[342px]">
        <TasksPanel />
      </div>

      <div className="pointer-events-auto absolute left-[1102px] top-[98px] w-[342px]">
        <SummaryPanel />
      </div>
      <div className="pointer-events-auto absolute left-[1102px] top-[384px] w-[342px]">
        <ConversationsPanel />
      </div>
      <div className="pointer-events-auto absolute left-[1102px] top-[762px] w-[342px]">
        <QuickActionsPanel />
      </div>

      <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-40">
        <p className="text-xl font-light tracking-[0.02em] text-white/90">
          {CLARA_READY_LABEL}
        </p>
      </div>
    </div>
  );
}
