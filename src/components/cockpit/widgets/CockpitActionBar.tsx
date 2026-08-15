"use client";

import {
  CalendarDays,
  CheckSquare,
  FileText,
  MessageSquare,
  Plus,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";

type CockpitActionKey =
  | "shortcutNewMission"
  | "shortcutAgenda"
  | "shortcutMissions"
  | "shortcutConversations"
  | "shortcutAutomations"
  | "shortcutDocuments";

interface CockpitAction {
  id: string;
  labelKey: CockpitActionKey;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
}

const ACTION_DEFS: CockpitAction[] = [
  { id: "mission", labelKey: "shortcutNewMission", icon: Plus },
  { id: "agenda", labelKey: "shortcutAgenda", icon: CalendarDays },
  { id: "missions", labelKey: "shortcutMissions", icon: CheckSquare },
  { id: "conversations", labelKey: "shortcutConversations", icon: MessageSquare },
  { id: "automations", labelKey: "shortcutAutomations", icon: Workflow },
  { id: "documents", labelKey: "shortcutDocuments", icon: FileText },
];

export default function CockpitActionBar() {
  const t = useTranslations("cockpit");

  return (
    <nav
      aria-label={t("actionsBarLabel")}
      className="w-full border-y border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
        {ACTION_DEFS.map((action) => {
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

              <span>{t(action.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
