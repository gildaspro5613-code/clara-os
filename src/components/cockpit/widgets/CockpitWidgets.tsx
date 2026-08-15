import { getTranslations } from "next-intl/server";
import CockpitActionBar from "./CockpitActionBar";
import AgendaWidget from "./agenda/AgendaWidget";

export default async function CockpitWidgets() {
  const t = await getTranslations("cockpit");

  return (
    <section
      aria-label={t("widgetsLabel")}
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
