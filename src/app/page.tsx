export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export default async function HomePage() {
  const operational = await resolveOperationalContext();

  return (
    <MainLayout>
      <Cockpit session={operational.session} acquisition={operational.acquisition} />
    </MainLayout>
  );
}
