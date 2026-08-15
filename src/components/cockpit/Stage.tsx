import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import ClaraVoiceWidget from "@/components/clara/ClaraVoiceWidget";

export default function Stage() {
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
      </div>

      {/* Main action — deliberately the only
          operational glass panel in the Hero */}
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
        <TasksPanel />
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
          <TasksPanel />
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
