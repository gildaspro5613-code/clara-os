import type { ClaraSession } from "@/lib/core/session";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

interface StageProps {
  session: ClaraSession;
}

function EmptyMissionPanel() {
  const t = useTranslations("cockpitUi");

  return (
    <GlassPanel>
      <div>
        <p className="text-xs uppercase tracking-[0.20em] text-white/50">
          {t("currentMission")}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {t("noMission")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {t("openMissions")}
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

export default function Stage({
  session,
}: StageProps) {
  const mission = session.mission;
  const firstName = session.user.firstName;

  return (
    <>
      {/* ============================================
          DESKTOP / LAPTOP
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
        <BriefPanel firstName={firstName} />

        <div className="mt-4 ml-3 w-[92%]">
          <ClaraVoiceWidget />
        </div>
      </div>

      {/* Agenda + current mission keep independent natural heights so
          a verbose mission is not pushed below the useful Hero area. */}
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
          flex-col
          items-end
          gap-4
          lg:flex
        "
      >
        <AgendaPanel />
        <div className="w-full">
          <MissionPanel mission={mission} />
        </div>
      </div>

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
