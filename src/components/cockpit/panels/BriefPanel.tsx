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
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface BriefPanelProps {
  session: ClaraSession;
  acquisition?: AcquisitionRecord | null;
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

export default function BriefPanel({ session, acquisition }: BriefPanelProps) {
  const t = useTranslations("cockpitUi");
  const mission = session.mission;
  const latestClaraMessage = [...session.conversation]
    .reverse()
    .find((message) => message.role === "clara")?.content;
  const understanding = session.brainDashboard?.understanding.summary;
  const needsAttention = mission?.status === "blocked" || Boolean(
    mission?.tasks.find((task) => !task.completed)?.execution?.autonomous === false,
  );
  const documentEvent = session.brainDashboard?.context.event.type === "DOCUMENT_RECEIVED";

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
          {understanding && (
            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-cyan-50/60">
              {understanding}
            </p>
          )}
          {needsAttention && (
            <p className="mt-3 text-xs font-medium text-amber-200/80">
              {t("attention")}: {mission.nextAction || t("noNextStep")}
            </p>
          )}
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

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-xs">
        {mission && <Link href="/missions" className="text-cyan-300/80 hover:text-cyan-200">{t("viewMissions")}</Link>}
        <Link href="/clara" className="text-cyan-300/80 hover:text-cyan-200">Clara →</Link>
        {session.conversation.length > 0 && <Link href="/conversations" className="text-cyan-300/80 hover:text-cyan-200">{t("latestConversations")} →</Link>}
        {acquisition && <a href="#acquisition" className="text-amber-200/80 hover:text-amber-100">Dossier commercial ↓</a>}
        {documentEvent && <Link href="/documents" className="text-cyan-300/80 hover:text-cyan-200">Documents →</Link>}
      </div>
    </GlassPanel>
  );
}
