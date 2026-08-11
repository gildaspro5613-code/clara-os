// ============================================
// CLARA OS
// Missions Module
//
// File : MissionDetail.tsx
// Responsibility :
// Official mission detail presentation.
// Interactive actions.
// ============================================

"use client";

import { useMemo, useState } from "react";
import type { Mission } from "../types/Mission";

interface MissionDetailProps {
  mission: Mission;
  onBack: () => void;
  onUpdate: (mission: Mission) => void;
}

function getMissionContext(
  mission: Mission,
  nextTaskTitle?: string
) {
  switch (mission.id) {
    case "mission-001":
      return {
        state:
          "La mission avance normalement. Le dispositif est proche de sa validation.",
        objective:
          "Rendre Clara Edissimo complètement opérationnelle.",
        clara: nextTaskTitle
          ? `La prochaine étape est : ${nextTaskTitle}`
          : "Toutes les actions prévues sont terminées.",
      };

    case "mission-002":
      return {
        state:
          "La production de Clara OS est en cours de construction.",
        objective:
          "Finaliser la première version opérationnelle de Clara OS.",
        clara: nextTaskTitle
          ? `Le prochain jalon est : ${nextTaskTitle}`
          : "Toutes les actions prévues sont terminées.",
      };

    case "mission-003":
      return {
        state:
          "La documentation n'a pas encore commencé.",
        objective:
          "Centraliser la documentation fonctionnelle et technique de Clara OS.",
        clara: nextTaskTitle
          ? `La prochaine étape est : ${nextTaskTitle}`
          : "Toutes les actions prévues sont terminées.",
      };

    default:
      return {
        state: "La mission est actuellement suivie par Clara.",
        objective: mission.objective,
        clara: nextTaskTitle
          ? `La prochaine étape est : ${nextTaskTitle}`
          : "Toutes les actions prévues sont terminées.",
      };
  }
}

export default function MissionDetail({
  mission,
  onBack,
  onUpdate,
}: MissionDetailProps) {
  const [tasks, setTasks] = useState(mission.tasks);

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

  const nextTask = tasks.find(
    (task) => !task.completed
  );

  const context = useMemo(
    () =>
      getMissionContext(
        mission,
        nextTask?.title
      ),
    [mission, nextTask?.title]
  );

  function toggleTask(taskId: string) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed: !task.completed,
          }
        : task
    );

    setTasks(updatedTasks);

    onUpdate({
      ...mission,
      tasks: updatedTasks,
      progress:
        updatedTasks.length > 0
          ? Math.round(
              (updatedTasks.filter((task) => task.completed).length /
                updatedTasks.length) *
                100
            )
          : 0,
    });
  }

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 text-xs uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-cyan-400"
        >
          ← Retour aux missions
        </button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
                  {mission.status === "active"
                    ? "Active"
                    : "Planifiée"}
                </span>

                <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {mission.priority === "critical"
                    ? "Priorité critique"
                    : mission.priority === "high"
                      ? "Haute priorité"
                      : mission.priority === "medium"
                        ? "Priorité normale"
                        : "Faible priorité"}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-medium tracking-tight lg:text-4xl">
                {mission.title}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                {mission.objective}
              </p>
            </header>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 lg:p-9">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                    Progression
                  </span>

                  <strong className="mt-2 block text-4xl font-medium">
                    {progress}%
                  </strong>
                </div>

                <span className="text-sm text-white/35">
                  {completedTasks} / {tasks.length} actions
                </span>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-10 border-t border-white/10 pt-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                  Actions
                </span>

                <div className="mt-5 space-y-3">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="group flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-4 text-left transition-all hover:border-cyan-400/20 hover:bg-white/[0.045]"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-all ${
                          task.completed
                            ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                            : "border-white/15 text-white/20 group-hover:border-cyan-400/40"
                        }`}
                      >
                        {task.completed ? "✓" : ""}
                      </span>

                      <span
                        className={
                          task.completed
                            ? "text-sm text-white/45 line-through"
                            : "text-sm text-white/80"
                        }
                      >
                        {task.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                    Prochaine action
                  </span>

                  <p className="mt-2 text-sm leading-6 text-white/80">
                    {nextTask?.title ??
                      "Toutes les actions sont terminées."}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                    Dernière action
                  </span>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {mission.lastAction ??
                      "Aucune action enregistrée."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:sticky lg:top-8">
            <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
              Contexte
            </span>

            <div className="mt-10">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                État
              </span>

              <p className="mt-4 text-sm leading-7 text-white/70">
                {context.state}
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                Objectif
              </span>

              <p className="mt-4 text-sm leading-7 text-white/70">
                {context.objective}
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                Clara
              </span>

              <p className="mt-4 text-sm leading-7 text-white/75">
                {context.clara}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
