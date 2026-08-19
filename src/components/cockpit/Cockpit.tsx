import type { ClaraSession } from "@/lib/core/session";

import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";
import CockpitWidgets from "./widgets/CockpitWidgets";

interface CockpitProps {
  session: ClaraSession;
}

export default function Cockpit({
  session,
}: CockpitProps) {
  return (
    <CockpitLayout hero={<Hero session={session} />}>
      <CockpitWidgets mission={session.mission} />
    </CockpitLayout>
  );
}
