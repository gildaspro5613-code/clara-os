import type { ClaraSession } from "@/lib/core/session";
import type { Mission } from "@/modules/missions/types/Mission";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";

interface StageProps {
  session: ClaraSession;
}

const FALLBACK_MISSION: Mission = {
  id: "cockpit-hero-fallback",
  title: "Finaliser le cockpit Clara OS",
  objective: "Clara poursuit l’intégration des derniers éléments de l’interface.",
  status: "active",
  priority: "high",
  createdAt: new Date(0),
  tasks: [],
  progress: 82,
  nextAction: "Assembler le Stage et positionner Clara.",
};

export default function Stage({ session }: StageProps) {
  const mission = session.mission ?? FALLBACK_MISSION;

  return (
    <>
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
      </div>

      {/* Main action */}
      <div
        className="
          pointer-events-auto
          absolute
          right-[5%]
          top-[18%]
          z-20
          hidden
          w-[25%]
          max-w-[360px]
          lg:block
        "
      >
        <TasksPanel mission={mission} />
      </div>

      {/* Mobile */}
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
          <TasksPanel mission={mission} />
        </div>
      </div>

      {/* Voice widget — bottom-centre, desktop only */}
      <div
        className="
          pointer-events-auto
          absolute
          bottom-[6%]
          left-1/2
          z-20
          hidden
          w-[260px]
          -translate-x-1/2
          lg:block
        "
      >
        <ClaraVoiceWidget />
      </div>
    </>
  );
}
