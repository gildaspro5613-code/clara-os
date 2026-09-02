import type { ClaraSession } from "@/lib/core/session";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";

interface StageProps {
  session: ClaraSession;
}

export default function Stage({
  session,
}: StageProps) {
  const mission = session.mission;

  return (
    <>
      {/* ============================================
          DESKTOP / LAPTOP
          Hero intentionally kept light.
          Clara remains the visual focal point.
          ============================================ */}

      {/* Clara's briefing */}
      <div
        className="
          pointer-events-auto
          absolute
          left-[5%]
          top-[12%]
          z-20
          hidden
          w-[25%]
          max-w-[360px]
          lg:block
        "
      >
        <BriefPanel />

        <div className="mt-4 ml-3 w-[92%]">
          <ClaraVoiceWidget />
        </div>
      </div>

      {/* Main action — deliberately the only
          operational glass panel in the Hero */}
      <div
        className="
          pointer-events-auto
          absolute
          right-[5%]
          top-[8%]
          z-20
          hidden
          w-[28%]
          max-w-[420px]
          lg:block
        "
      >
        <AgendaPanel />

        {mission && <TasksPanel mission={mission} />}
      </div>

      {/* Context zone reserved for:
          date / weather / next agenda item.
          Kept visually discreet. */}

      {/* ============================================
          MOBILE
          ============================================ */}

      <div
        className="
          pointer-events-none
          absolute
          left-4
          right-4
          top-[12%]
          z-20
          flex
          flex-col
          gap-3
          lg:hidden
        "
      >
        <div className="pointer-events-auto">
          <BriefPanel />
        </div>
      </div>

      <div
        className="
          pointer-events-none
          absolute
          left-4
          right-4
          top-[58%]
          z-20
          flex
          flex-col
          gap-3
          lg:hidden
        "
      >
        <div className="pointer-events-auto">
          {mission && <TasksPanel mission={mission} />}
        </div>
      </div>
    </>
  );
}
