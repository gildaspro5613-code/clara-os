import AgendaWidget from "./agenda/AgendaWidget";
import MissionWidget from "./missions/MissionWidget";
import ClaraChatWidget from "./clara/ClaraChatWidget";
import WeatherWidget from "./weather/WeatherWidget";
import WazeWidget from "./waze/WazeWidget";

import AttentionPanel from "../panels/AttentionPanel";
import QuickActionsPanel from "../panels/QuickActionsPanel";
import SummaryPanel from "../panels/SummaryPanel";
import ConversationsPanel from "../panels/ConversationsPanel";
import type { Mission } from "@/modules/missions/types/Mission";

interface CockpitWidgetsProps {
  mission: Mission | null;
}

export default function CockpitWidgets({
  mission,
}: CockpitWidgetsProps) {
  return (
    <section
      aria-label="Widgets du Cockpit"
      className="w-full overflow-hidden bg-[#070B12]"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 xl:px-8 xl:py-14">

        {/* ============================================
            OVERVIEW
            Trois cartes de même importance.
            ============================================ */}

        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <SummaryPanel />
          </div>

          <div className="min-w-0">
            <AttentionPanel />
          </div>

          <div className="min-w-0">
            <QuickActionsPanel />
          </div>
        </div>

        {/* ============================================
            ACTIVITY
            Deux aperçus complémentaires.
            Aucun étirement artificiel.
            ============================================ */}

        <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0">
            <ConversationsPanel />
          </div>

          <div className="min-w-0">
            <AgendaWidget />
          </div>
        </div>

        {/* ============================================
            CONFORT & OPÉRATION
            Mission + widgets de confort Clara OS.
            ============================================ */}

        <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <MissionWidget mission={mission} />
          </div>

          <div className="min-w-0">
            <WazeWidget />
          </div>

          <div className="min-w-0">
            <WeatherWidget />
          </div>
        </div>

        {/* ============================================
            CLARA
            Entrée conversationnelle rapide.
            L'espace de travail complet reste dans
            la page Clara dédiée.
            ============================================ */}

        <div className="mt-5">
          <ClaraChatWidget />
        </div>

      </div>
    </section>
  );
}
