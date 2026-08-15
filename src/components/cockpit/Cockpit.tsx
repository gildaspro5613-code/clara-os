import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";
import CockpitWidgets from "./widgets/CockpitWidgets";

export default function Cockpit() {
  return (
    <CockpitLayout hero={<Hero />}>
      <CockpitWidgets />
    </CockpitLayout>
  );
}
