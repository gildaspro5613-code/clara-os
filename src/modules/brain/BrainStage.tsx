// ============================================
// CLARA OS
// Brain Module
//
// File : BrainStage.tsx
// Responsibility :
// Official Brain presentation.
// No cognitive business logic.
// ============================================

import type { BrainDashboard } from "@/lib/brain/dashboard";
import { getTranslations } from "next-intl/server";

interface BrainStageProps {
  dashboard: BrainDashboard;
}

export default async function BrainStage({
  dashboard,
}: BrainStageProps) {
  const t = await getTranslations("brainPage");

  const confidenceLabel = (confidence: number) =>
    confidence >= 0.8 ? t("levels.high") : confidence >= 0.5 ? t("levels.medium") : t("levels.low");
  const priorityLabel = (priority: string) =>
    priority === "CRITICAL" ? t("priorities.critical") : priority === "HIGH" ? t("priorities.high") : priority === "LOW" ? t("priorities.low") : t("priorities.normal");
  const recommendationLabel = (confidence: string) =>
    confidence === "HIGH" ? t("levels.high") : confidence === "MEDIUM" ? t("levels.medium") : t("levels.low");

  const {
    context,
    memory,
    understanding,
    decision,
    tasks,
    recommendation,
  } = dashboard;

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* ============================================
            HEADER
        ============================================ */}

        <header className="mb-10 border-b border-white/10 pb-8">
          <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">
            CLARA OS
          </span>

          <h1 className="mt-3 text-4xl font-medium tracking-tight">
            Brain
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            {t("subtitle")}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* ============================================
              MAIN
          ============================================ */}

          <section className="space-y-6">

            {/* UNDERSTANDING */}

            <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 lg:p-9">
              <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
                {t("understanding")}
              </span>

              <h2 className="mt-5 text-2xl font-medium">
                {understanding.intent}
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
                {understanding.summary}
              </p>

              <div className="mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-6">

                <div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                    {t("confidence")}
                  </span>

                  <p className="mt-2 text-sm text-white/75">
                    {confidenceLabel(
                      understanding.confidence
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                    {t("nextStep")}
                  </span>

                  <p className="mt-2 text-sm text-white/75">
                    {understanding.nextAction ?? "—"}
                  </p>
                </div>

              </div>
            </article>

            {/* DECISION */}

            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:p-9">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                {t("decision")}
              </span>

              <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                <div>
                  <h2 className="text-xl font-medium">
                    {decision.summary}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {decision.objective.description}
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
                  {priorityLabel(decision.priority)}
                </span>

              </div>
            </article>

            {/* RECOMMENDATION */}

            <article className="rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.025] p-7 lg:p-9">
              <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
                {t("recommendation")}
              </span>

              <h2 className="mt-5 text-xl font-medium leading-8">
                {recommendation.summary}
              </h2>

              {recommendation.rationale && (
                <p className="mt-4 text-sm leading-7 text-white/55">
                  {recommendation.rationale}
                </p>
              )}

              <div className="mt-7 border-t border-white/10 pt-5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("confidenceLevel")}
                </span>

                <p className="mt-2 text-sm text-white/75">
                  {recommendationLabel(
                    recommendation.confidence
                  )}
                </p>
              </div>
            </article>

            {/* TASKS */}

            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:p-9">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                {t("plan")}
              </span>

              <div className="mt-5 space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-4"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400/60" />

                    <div>
                      <p className="text-sm text-white/80">
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="mt-1 text-xs text-white/35">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

          </section>

          {/* ============================================
              CONTEXT
          ============================================ */}

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:sticky lg:top-8">

            <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
              {t("context")}
            </span>

            <div className="mt-7">

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("event")}
                </span>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  {context.event.type}
                </p>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("origin")}
                </span>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  {context.event.source}
                </p>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("memory")}
                </span>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  {memory.facts.length > 0 ? t("knownFacts", {count: memory.facts.length}) : t("noFacts")}
                </p>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">
                  Clara
                </span>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  {t("claraHelp")}
                </p>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}
