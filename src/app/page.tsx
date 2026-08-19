import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { loadSession } from "@/lib/core/store/session-store";

export default function HomePage() {
  const session = loadSession();

  return (
    <MainLayout>
      <Cockpit session={session} />
    </MainLayout>
  );
}
