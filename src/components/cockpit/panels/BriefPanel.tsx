/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : BriefPanel.tsx
 * Responsibility :
 * Operational briefing displayed in the cockpit
 * hero section from the shared Clara session.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import type { ClaraSession } from "@/lib/core/session";
import { useTranslations } from "next-intl";

interface BriefPanelProps {
  session: ClaraSession;
}

function personalizeGreeting(
  greeting: string,
  firstName?: string | null,
): string {
  if (!firstName?.trim()) return greeting;

  return greeting.replace(
    /^([^.!?]+)([.!?])/,
    `$1 ${firstName.trim()}$2`,
  );
}

export default function BriefPanel({ session }: BriefPanelProps) {
  const t = useTranslations("cockpitUi");
  const mission = session.mission;
  const latestClaraMessage = [...session.conversation]
    .reverse()
    .find((message) => message.role === "clara")?.content;

  return (
    <GlassPanel className="max-w-[18rem] px-6 py-5 bg-[#07111f]/55 border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.18)] backdrop-blur-[18px]">
      <h2 className="mb-3 text-[1.6rem] leading-snug font-light text-white/90">
        {personalizeGreeting(t("greeting"), session.user.firstName)}
      </h2>

      {mission ? (
        <>
          <p className="text-[10px] uppercase tracking-[0.20em] text-white/40">
            {t("currentMission")}
          </p>
          <p className="mt-1 text-sm font-medium leading-normal text-white/82">
            {mission.title}
          </p>
          <p className="mt-3 text-sm leading-normal text-white/62">
            {mission.nextAction || mission.objective}
          </p>
        </>
      ) : latestClaraMessage ? (
        <p className="text-sm leading-normal text-white/68">
          {latestClaraMessage}
        </p>
      ) : (
        <p className="text-sm leading-normal text-white/58">
          {t("noMission")}
        </p>
      )}
    </GlassPanel>
  );
}
