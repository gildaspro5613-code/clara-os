import AgendaWidget from "./agenda/AgendaWidget";
import MissionWidget from "./missions/MissionWidget";
import ClaraChatWidget from "./clara/ClaraChatWidget";
import WeatherWidget from "./weather/WeatherWidget";
import WazeWidget from "./waze/WazeWidget";

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
      className="w-full bg-[#070B12]"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 py-12 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <MissionWidget mission={mission} />
        </div>

        <div>
          <AgendaWidget />
        </div>

        <div>
          <WeatherWidget />
        </div>

        <div>
          <WazeWidget />
        </div>

        <div className="lg:col-span-2">
          <ClaraChatWidget />
        </div>
      </div>
      </div>
    </section>
  );
}
