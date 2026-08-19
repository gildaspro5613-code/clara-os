import MainLayout from "@/components/layout/MainLayout";
import ClaraChatWidget from "@/components/cockpit/widgets/clara/ClaraChatWidget";
import { loadSession } from "@/lib/core/store/session-store";

export const dynamic = "force-dynamic";

export default async function ClaraPage() {
  const session = await loadSession();
  const mission = session.mission;

  return (
    <MainLayout>
      <div className="w-full p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">
            Intelligence opérationnelle
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            Clara
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            L’intelligence opérationnelle de Clara OS, connectée à son état
            courant et à sa mission active.
          </p>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              État
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {session.state}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Mission actuelle
            </p>
            <p className="mt-3 break-words text-base font-semibold leading-relaxed text-white">
              {mission?.title ?? "Aucune mission active"}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Objectif
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {mission?.objective ?? "Aucun objectif actif"}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Prochaine action
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {mission?.nextAction ?? "Aucune action suivante définie"}
            </p>
          </article>
        </section>

        <div className="max-w-4xl">
          <ClaraChatWidget />
        </div>
      </div>
    </MainLayout>
  );
}
