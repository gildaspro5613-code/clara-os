export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { loadSession } from "@/lib/core/store/session-store";

export default async function HomePage() {
  const session = await loadSession();

  return (
    <MainLayout>
      <Cockpit session={session} />
    </MainLayout>
  );
}
