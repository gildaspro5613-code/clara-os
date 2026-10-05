import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";
import CockpitWidgets from "./widgets/CockpitWidgets";

interface CockpitProps {
  session: ClaraSession;
  acquisition?: AcquisitionRecord | null;
}

export default function Cockpit({
  session,
  acquisition,
}: CockpitProps) {
  return (
    <CockpitLayout hero={<Hero session={session} acquisition={acquisition} />}>
      <CockpitWidgets session={session} acquisition={acquisition} />
    </CockpitLayout>
  );
}
