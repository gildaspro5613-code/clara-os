import {loadNativeConversationNavigation} from "@/components/native/conversation-navigation";
import NativeConversationList from "@/components/native/NativeConversationList";
import ConversationsPanel from "@/components/cockpit/panels/ConversationsPanel";
import GlassPanel from "@/components/ui/GlassPanel";
import Link from "next/link";
import NativeDocumentsPanel from "@/components/native/NativeDocumentsPanel";
import {nativeContext,nativeThreadCertified} from "@/lib/native/scoped-context";
import { nativePage } from "@/lib/native/page-fence";
import { getTranslations } from "next-intl/server";
import CommercialDraftEditor from "@/components/cockpit/panels/CommercialDraftEditor";
import { buildCommercialQualificationDraft } from "@/lib/acquisition/commercial-communication-draft";
import { loadProjectIntake } from "@/lib/intake/md-project-intake-inbox";
import MainLayout from "@/components/layout/MainLayout";
import ClaraVoiceWidget from "@/components/clara/ClaraVoiceWidget";
import ClaraChatWidget from "@/components/cockpit/widgets/clara/ClaraChatWidget";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export const dynamic = "force-dynamic";

interface ClaraPageProps {
  searchParams?: Promise<{
    intent?: string | string[];
  }>;
}

export default async function ClaraPage({
  searchParams,
}: ClaraPageProps) {
  return nativePage(async()=>{

  const t = await getTranslations("pages");
  const ui = await getTranslations("ui");
  const conversationNavigation=await loadNativeConversationNavigation();
  const params = await searchParams;
  const { session, acquisition } = await resolveOperationalContext();
  const intake = acquisition && !acquisition.commercialDraft ? await loadProjectIntake(acquisition.workspaceId, acquisition.submissionId).catch(() => null) : null;
  const draft = acquisition?.commercialDraft ?? (acquisition && intake ? buildCommercialQualificationDraft(acquisition, intake.intake) : null);
  const mission = session.mission;
  const intent = typeof params?.intent === "string" ? params.intent : undefined;
  const focusClaraInput = intent === "new-mission" || intent === "email";

  return (
    <MainLayout>
      <div className="w-full p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">
            {t("claraEyebrow")}
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            Clara
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("claraSubtitle")}
          </p>
        </div>

        <details data-clara-mission-context className="native-panel mb-6 rounded-2xl border border-white/10 p-4"><summary>{t("currentMission")} · <span>{mission?.title ?? t("noMission")}</span></summary><section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t("state")}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {t.has(`states.${session.state}`) ? t(`states.${session.state}`) : t("states.UNKNOWN")}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t("currentMission")}
            </p>
            <p className="mt-3 break-words text-base font-semibold leading-relaxed text-white">
              {mission?.title ?? t("noMission")}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t("objective")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {mission?.objective ?? t("noObjective")}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t("nextAction")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {mission?.nextAction ?? t("noNextAction")}
            </p>
          </article>
        </section></details>

        {acquisition && <details id="source-details" className="mb-6 max-w-5xl rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-cyan-200">{ui("sourceOriginal")}</summary><p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{acquisition.qualification.opportunity.brief}</p><p className="mt-3 text-sm text-white/75">{acquisition.lifecycle.nextAction}</p></details>}

        {draft && <details id="commercial-draft" open={intent==="email"} className="native-panel mb-6 max-w-5xl rounded-2xl border border-white/10 p-4"><summary>{ui("communicationPreparedByClara")}</summary><CommercialDraftEditor initialDraft={draft} /></details>}

        <div className="grid max-w-5xl gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <ClaraChatWidget nativeThreadReadOnly={!!nativeContext()&&!nativeThreadCertified(session)} key={nativeContext()?.scope.sessionId} nativeSessionId={nativeContext()?.scope.sessionId}
            autoFocus={focusClaraInput}
            initialMessages={session.conversation}
            userFirstName={session.user.firstName}
          />
          <aside className="space-y-4">{conversationNavigation?<NativeConversationList {...conversationNavigation}/>:<p role="status" className="mb-4 text-sm text-white/65">{ui("nativeHistoryUnavailable")}</p>}
            <ConversationsPanel session={session} />
            <GlassPanel title={t("currentMission")}><p className="break-words text-white/80">{mission?.title??t("noMission")}</p>{mission&&<Link href={`/missions?mission=${encodeURIComponent(mission.id)}`} className="mt-3 block text-cyan-200">{ui("viewAllMissions")}</Link>}</GlassPanel>
            {nativeContext()?<GlassPanel><Link href="/telephonie" className="text-cyan-200">{ui("uiVoiceStatus")}</Link></GlassPanel>:<ClaraVoiceWidget />}
          </aside>
        </div>
        <NativeDocumentsPanel referencesOnly />
      </div>
    </MainLayout>
  );
  });
}
