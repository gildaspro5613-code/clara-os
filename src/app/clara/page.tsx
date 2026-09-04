import { getTranslations } from "next-intl/server";
import MainLayout from "@/components/layout/MainLayout";
import ClaraChatWidget from "@/components/cockpit/widgets/clara/ClaraChatWidget";
import { loadSession } from "@/lib/core/store/session-store";

export const dynamic = "force-dynamic";

interface ClaraPageProps {
  searchParams?: Promise<{
    intent?: string | string[];
  }>;
}

export default async function ClaraPage({
  searchParams,
}: ClaraPageProps) {
  const t = await getTranslations("pages");
  const params = await searchParams;
  const session = await loadSession();
  const mission = session.mission;
  const startNewMission = params?.intent === "new-mission";

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

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t("state")}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {session.state}
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
        </section>

        <div className="max-w-4xl">
          <ClaraChatWidget autoFocus={startNewMission} />
        </div>
      </div>
    </MainLayout>
  );
}
