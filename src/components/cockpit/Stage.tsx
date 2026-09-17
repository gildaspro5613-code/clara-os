import type { ClaraSession } from "@/lib/core/session";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";

interface StageProps {
  session: ClaraSession;
}

function EmptyMissionPanel() {
  return (
    <GlassPanel>
      <div>
        <p className="text-xs uppercase tracking-[0.20em] text-white/50">
          Mission actuelle
        </p>
        <p className="mt-2 text-lg font-semibold">
          Aucune mission active
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Parlez à Clara pour définir un objectif et démarrer une mission.
        </p>
      </div>
    </GlassPanel>
  );
}

interface MissionPanelProps {
  mission: ClaraSession["mission"];
}

function MissionPanel({ mission }: MissionPanelProps) {
  return mission ? <TasksPanel mission={mission} /> : <EmptyMissionPanel />;
}

export default function Stage({ session }: StageProps) {
  const mission = session.mission;
  const firstName = session.user.firstName;

  return (
    <>
      {/* Desktop / laptop: briefing and agenda anchor the upper Hero while
          voice and mission settle lower into the workspace. */}
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
        <BriefPanel firstName={firstName} />
      </div>

      <div
        className="
          pointer-events-auto
          absolute
          left-[6%]
          top-[61%]
          z-20
          hidden
          w-[23%]
          max-w-[330px]
          lg:block
        "
      >
        <ClaraVoiceWidget />
      </div>

      <div
        className="
          pointer-events-auto
          absolute
          right-[5%]
          top-[7%]
          z-20
          hidden
          w-[28%]
          max-w-[420px]
          lg:block
        "
      >
        <AgendaPanel />
      </div>

      <div
        className="
          pointer-events-auto
          absolute
          right-[5%]
          top-[61%]
          z-20
          hidden
          w-[28%]
          max-w-[420px]
          lg:block
        "
      >
        <MissionPanel mission={mission} />
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
          <BriefPanel firstName={firstName} />
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
          <MissionPanel mission={mission} />
        </div>
      </div>
    </>
  );
}
