"use client";

import {
  CalendarDays,
  CheckSquare,
  FileText,
  MessageSquare,
  Plus,
  Workflow,
} from "lucide-react";

interface CockpitAction {
  id: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
}

const ACTIONS: CockpitAction[] = [
  {
    id: "mission",
    label: "Nouvelle mission",
    icon: Plus,
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
  },
  {
    id: "missions",
    label: "Missions",
    icon: CheckSquare,
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: MessageSquare,
  },
  {
    id: "automations",
    label: "Automatisations",
    icon: Workflow,
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
  },
];

export default function CockpitActionBar() {
  return (
    <nav
      aria-label="Actions Clara OS"
      className="w-full border-y border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              type="button"
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <Icon
                size={16}
                strokeWidth={1.7}
                className="text-white/55 transition group-hover:text-white"
              />

              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
