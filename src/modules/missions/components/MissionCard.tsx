// ============================================
// CLARA OS
// Missions Module
//
// File : MissionCard.tsx
// Responsibility :
// Official secondary mission presentation.
// ============================================

import type { Mission } from "../types/Mission";

interface MissionCardProps {
  mission: Mission;
  onSelect: (mission: Mission) => void;
}

const statusLabels = {
  planned: "Planifiée",
  active: "Active",
  blocked: "Bloquée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const priorityLabels = {
  low: "Faible",
  medium: "Normale",
  high: "Haute",
  critical: "Critique",
};

export default function MissionCard({
  mission,
  onSelect,
}: MissionCardProps) {
  const completedTasks = mission.tasks.filter(
    (task) => task.completed
  ).length;

  const progress =
    mission.tasks.length > 0
      ? Math.round(
          (completedTasks / mission.tasks.length) * 100
        )
      : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(mission)}
      className="group w-full rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-left transition-all duration-200 hover:border-cyan-400/30 hover:bg-white/[0.055]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
          {statusLabels[mission.status]}
        </span>

        <span className="text-xs uppercase tracking-[0.16em] text-white/40">
          {priorityLabels[mission.priority]}
        </span>
      </div>

      <h3 className="text-xl font-medium leading-tight text-white">
        {mission.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {mission.objective}
      </p>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.16em] text-white/40">
            Progression
          </span>

          <strong className="text-white/80">
            {progress}%
          </strong>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 text-xs text-white/40">
        {completedTasks} / {mission.tasks.length} actions terminées
      </div>

      {mission.nextAction && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
            Prochaine action
          </span>

          <p className="mt-2 text-sm leading-5 text-white/75">
            {mission.nextAction}
          </p>
        </div>
      )}

      <div className="mt-5 text-[10px] uppercase tracking-[0.18em] text-cyan-400/50 opacity-0 transition-opacity group-hover:opacity-100">
        Ouvrir la mission →
      </div>
    </button>
  );
}
