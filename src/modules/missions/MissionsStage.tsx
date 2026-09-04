// ============================================
// CLARA OS
// Missions Module
//
// File : MissionsStage.tsx
// Responsibility :
// Official Missions composition.
// Mission state and local persistence.
// ============================================

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import MissionCard from "./components/MissionCard";
import MissionDetail from "./components/MissionDetail";
import type { Mission } from "./types/Mission";

interface MissionsStageProps {
  initialMissions?: Mission[];
}

export default function MissionsStage({ initialMissions = [] }: MissionsStageProps) {
  const t = useTranslations("missionsPage");
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const activeMissions = missions.filter((mission) => mission.status === "active");
  const plannedMissions = missions.filter((mission) => mission.status === "planned");
  const blockedMissions = missions.filter((mission) => mission.status === "blocked");
  const activeMission = activeMissions[0];
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);

  function updateMission(updatedMission: Mission) {
    setMissions((currentMissions) => currentMissions.map((mission) =>
      mission.id === updatedMission.id ? updatedMission : mission
    ));
  }

  if (selectedMission) {
    return (
      <MissionDetail
        mission={selectedMission}
        onBack={() => setSelectedMissionId(null)}
        onUpdate={updateMission}
      />
    );
  }

  const completedTasks = activeMission
    ? activeMission.tasks.filter((task) => task.completed).length
    : 0;
  const activeProgress = activeMission
    ? activeMission.tasks.length > 0
      ? Math.round((completedTasks / activeMission.tasks.length) * 100)
      : 0
    : 0;
  const nextTask = activeMission?.tasks.find((task) => !task.completed);

  const activePriorityKey = activeMission
    ? `priority.${activeMission.priority}` as const
    : "priority.low" as const;

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">CLARA OS</span>
                <h1 className="mt-3 text-4xl font-medium tracking-tight">{t("title")}</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">{t("subtitle")}</p>
              </div>

              <div className="flex gap-8">
                <div>
                  <strong className="block text-2xl font-medium">{activeMissions.length}</strong>
                  <span className="text-xs uppercase tracking-[0.16em] text-white/35">{t("stats.active")}</span>
                </div>
                <div>
                  <strong className="block text-2xl font-medium">{plannedMissions.length}</strong>
                  <span className="text-xs uppercase tracking-[0.16em] text-white/35">{t("stats.planned")}</span>
                </div>
              </div>
            </header>

            {activeMission && (
              <section className="mb-12">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-white/45">{t("activeMission")}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMissionId(activeMission.id)}
                  className="group w-full rounded-3xl border border-white/10 bg-white/[0.045] p-7 text-left shadow-2xl shadow-black/20 transition-all duration-200 hover:border-cyan-400/30 hover:bg-white/[0.055] lg:p-9"
                >
                  <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
                          {t("status.active")}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">{t(activePriorityKey)}</span>
                      </div>
                      <h2 className="mt-5 text-3xl font-medium tracking-tight">{activeMission.title}</h2>
                      <p className="mt-4 text-base leading-7 text-white/65">{activeMission.objective}</p>
                      {activeMission.context && (
                        <p className="mt-3 text-sm leading-6 text-white/35">{activeMission.context}</p>
                      )}
                    </div>

                    <div className="min-w-[220px] lg:text-right">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{t("progress")}</span>
                      <strong className="mt-2 block text-4xl font-medium">{activeProgress}%</strong>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${activeProgress}%` }} />
                    </div>
                    <p className="mt-3 text-xs text-white/35">
                      {t("completedActions", { completed: completedTasks, total: activeMission.tasks.length })}
                    </p>
                  </div>

                  <div className="mt-8 grid gap-6 border-t border-white/10 pt-7 lg:grid-cols-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">{t("nextAction")}</span>
                      <p className="mt-2 text-sm leading-6 text-white/80">{nextTask?.title ?? t("allActionsCompleted")}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">{t("lastAction")}</span>
                      <p className="mt-2 text-sm leading-6 text-white/55">{activeMission.lastAction ?? t("noLastAction")}</p>
                    </div>
                  </div>

                  <div className="mt-7 text-[10px] uppercase tracking-[0.18em] text-cyan-400/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {t("openMission")}
                  </div>
                </button>
              </section>
            )}

            {blockedMissions.length > 0 && (
              <section className="mb-12">
                <div className="mb-5">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-amber-400/70">{t("blockedEyebrow")}</span>
                  <h2 className="mt-2 text-xl font-medium">{t("blockedTitle")}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">{t("blockedDescription")}</p>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {blockedMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} onSelect={(selected) => setSelectedMissionId(selected.id)} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-5">
                <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">{t("upcoming")}</span>
                <h2 className="mt-2 text-xl font-medium">{t("plannedTitle")}</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {plannedMissions.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} onSelect={(selected) => setSelectedMissionId(selected.id)} />
                ))}
              </div>
            </section>
          </div>

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:sticky lg:top-8">
            <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">{t("context")}</span>
            <div className="mt-7">
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">{t("missionsLabel")}</span>
                <p className="mt-2 text-sm leading-6 text-white/70">{t("missionCount", { count: missions.length })}</p>
              </div>
              <div className="my-7 border-t border-white/10" />
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">{t("activeLabel")}</span>
                <p className="mt-2 text-sm leading-6 text-white/70">{t("activeCount", { count: activeMissions.length })}</p>
              </div>
              <div className="my-7 border-t border-white/10" />
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">{t("interventionLabel")}</span>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {blockedMissions.length > 0 ? t("blockedCount", { count: blockedMissions.length }) : t("noIntervention")}
                </p>
              </div>
              <div className="my-7 border-t border-white/10" />
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">{t("plannedLabel")}</span>
                <p className="mt-2 text-sm leading-6 text-white/70">{t("activeCount", { count: plannedMissions.length })}</p>
              </div>
              <div className="my-7 border-t border-white/10" />
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Clara</span>
                <p className="mt-2 text-sm leading-6 text-white/75">{t("claraContext")}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
