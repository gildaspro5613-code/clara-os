// ============================================
// CLARA OS
// Brain Route
//
// File : page.tsx
// Responsibility :
// Present Clara's latest real Brain snapshot.
// ============================================

import MainLayout from "@/components/layout/MainLayout";
import BrainStage from "@/modules/brain/BrainStage";
import { loadSession } from "@/lib/core/store/session-store";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  const session = await loadSession();
  const dashboard = session.brainDashboard;

  return (
    <MainLayout>
      {dashboard ? (
        <BrainStage dashboard={dashboard} />
      ) : (
        <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
          <div className="mx-auto max-w-7xl">
            <header className="mb-10 border-b border-white/10 pb-8">
              <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">CLARA OS</span>
              <h1 className="mt-3 text-4xl font-medium tracking-tight">Brain</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                Aucun cycle Brain opérationnel n’a encore été enregistré dans cette session.
              </p>
            </header>
            {session.mission && (
              <section className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.035] p-7 lg:p-9">
                <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">Mission actuelle</span>
                <h2 className="mt-4 text-xl font-medium">{session.mission.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{session.mission.objective}</p>
                {session.mission.nextAction && (
                  <p className="mt-5 text-sm leading-7 text-white/75">{session.mission.nextAction}</p>
                )}
              </section>
            )}
          </div>
        </main>
      )}
    </MainLayout>
  );
}
