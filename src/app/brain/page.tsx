// ============================================
// CLARA OS
// Brain Route
//
// File : page.tsx
// Responsibility :
// Build and present one Brain dashboard snapshot.
// ============================================

import MainLayout from "@/components/layout/MainLayout";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
import BrainStage from "@/modules/brain/BrainStage";

import { runBrainDashboard } from "@/lib/brain";

import {
  EventType,
  type Event,
} from "@/types";

export default async function BrainPage() {
  const locale = await getLocale();

  const event: Event = {
    id: "brain-dashboard-preview",
    type: EventType.SYSTEM,
    source: "CLARA OS",
    timestamp: new Date(),
    payload: {
      source: "Brain dashboard",
    },
  };

  const dashboard = await runBrainDashboard(event, undefined, locale);

  return (
    <MainLayout>
      <BrainStage
        dashboard={dashboard}
      />
    </MainLayout>
  );
}
