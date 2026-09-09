// ============================================
// CLARA OS
// Missions Module
//
// File : MissionsStage.tsx
// Responsibility :
// Official Missions composition backed by durable server persistence.
// ============================================

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import MissionCard from "./components/MissionCard";
import MissionDetail from "./components/MissionDetail";
import { missionsMock } from "./data/missions.mock";
import { missionStore } from "./mission-store";
import type { Mission } from "./types/Mission";

type SerializedMission = Omit<Mission, "createdAt" | "dueDate"> & {
  createdAt: string;
  dueDate?: string;
};

function hydrateMission(mission: SerializedMission): Mission {
  return {
    ...mission,
    createdAt: new Date(mission.createdAt),
    dueDate: mission.dueDate ? new Date(mission.dueDate) : undefined,
  };
}

async function loadDurableMissions(): Promise<Mission[]> {
  const response = await fetch("/api/missions", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load missions.");

  const payload = (await response.json()) as {
    success?: boolean;
    missions?: SerializedMission[];
  };

  if (!payload.success || !Array.isArray(payload.missions)) {
    throw new Error("Invalid missions response.");
  }

  return payload.missions.map(hydrateMission);
}

async function saveDurableMission(mission: Mission): Promise<Mission> {
  const response = await fetch("/api/missions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mission }),
  });

  if (!response.ok) throw new Error("Unable to save mission.");

  const payload = (await response.json()) as {
    success?: boolean;
    mission?: SerializedMission;
  };

  if (!payload.success || !payload.mission) {
    throw new Error("Invalid mission response.");
  }

  return hydrateMission(payload.mission);
}

export default function MissionsStage() {
  const t = useTranslations("missions");
  const tCommon = useTranslations("common");

  const [missions, setMissions] = useState<Mission[]>(() => {
    missionStore.seed(missionsMock);
    return missionStore.list();
  });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  useEffect(() => missionStore.subscribe((snapshot) => setMissions([...snapshot])), []);

  useEffect(() => {
    let cancelled = false;

    void loadDurableMissions()
      .then((durableMissions) => {
        if (!cancelled) missionStore.replace(durableMissions);
      })
      .catch(() => {
        // Keep the current read-only snapshot if durable persistence is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeMissions = missions.filter((mission) => mission.status === "active");
  const plannedMissions = missions.filter((mission) => mission.status === "planned");
  const activeMission = activeMissions[0];
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);

  function updateMission(updatedMission: Mission) {
    const optimistic = missionStore.upsert(updatedMission);

    void saveDurableMission(optimistic)
      .then((saved) => {
        missionStore.upsert(saved);
      })
      .catch(() => {
        void loadDurableMissions()
          .then((durableMissions) => missionStore.replace(durableMissions))
          .catch(() => {
            // Leave the optimistic snapshot visible if the durable store is unreachable.
          });
      });
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
  const activeProgress = activeMission?.progress ?? 0;
  const nextTask = activeMission?.tasks.find((task) => !task.completed);

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">
              {tCommon("appName")}
            </span>
            <h1 className="mt-3 text-4xl font-medium tracking-tight">{t("title")}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">{t("description")}</p>
          </div>

          <div className="flex gap-8">
            <div>
              <strong className="block text-2xl font-medium">{activeMissions.length}</strong>
              <span className="text-xs uppercase tracking-[0.16em] text-white/35">{t("status.active")}</span>
            </div>
            <div>
              <strong className="block text-2xl font-medium">{plannedMissions.length}</strong>
              <span className="text-xs uppercase tracking-[0.16em] text-white/35">{t("status.planned")}</span>
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
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">{t("status.active")}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">{tCommon("priority.high")}</span>
                  </div>
                  <h2 className="mt-5 text-3xl font-medium tracking-tight">{activeMission.title}</h2>
                  <p className="mt-4 text-base leading-7 text-white/65">{activeMission.objective}</p>
                  {activeMission.context && <p className="mt-3 text-sm leading-6 text-white/35">{activeMission.context}</p>}
                </div>
                <div className="min-w-[220px] lg:text-right">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{tCommon("progress")}</span>
                  <strong className="mt-2 block text-4xl font-medium">{activeProgress}%</strong>
                </div>
              </div>

              <div className="mt-8">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${activeProgress}%` }} />
                </div>
                <p className="mt-3 text-xs text-white/35">{t("actionsCompleted", { completed: completedTasks, total: activeMission.tasks.length })}</p>
              </div>

              <div className="mt-8 grid gap-6 border-t border-white/10 pt-7 lg:grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">{t("nextAction")}</span>
                  <p className="mt-2 text-sm leading-6 text-white/80">{nextTask?.title ?? t("allActionsCompleted")}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">{t("lastAction")}</span>
                  <p className="mt-2 text-sm leading-6 text-white/55">{activeMission.lastAction ?? t("noActionRecorded")}</p>
                </div>
              </div>

              <div className="mt-7 text-[10px] uppercase tracking-[0.18em] text-cyan-400/50 opacity-0 transition-opacity group-hover:opacity-100">{t("openMission")} →</div>
            </button>
          </section>
        )}

        <section>
          <div className="mb-5">
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">{t("upcoming")}</span>
            <h2 className="mt-2 text-xl font-medium">{t("plannedMissions")}</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {plannedMissions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} onSelect={(selected) => setSelectedMissionId(selected.id)} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
