import CockpitActionBar from "./CockpitActionBar";
import AgendaWidget from "./agenda/AgendaWidget";

export default function CockpitWidgets() {
  return (
    <section
      aria-label="Widgets du Cockpit"
      className="w-full bg-[#050505]"
    >
      <CockpitActionBar />

      <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
        <div className="max-w-[520px]">
          <AgendaWidget />
        </div>
      </div>
    </section>
  );
}
