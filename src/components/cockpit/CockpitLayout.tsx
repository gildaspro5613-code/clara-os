/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : CockpitLayout.tsx
 * Responsibility :
 * Defines the overall layout of
 * Clara's Cockpit.
 * ============================================
 */

import { ReactNode } from "react";

export interface CockpitLayoutProps {
  hero: ReactNode;
  brief: ReactNode;
  journal: ReactNode;
  actions: ReactNode;
  instruments: ReactNode;
}

export default function CockpitLayout({
  hero,
  brief,
  journal,
  actions,
  instruments,
}: CockpitLayoutProps) {
  return (
    <main className="space-y-8">

      {hero}

      <section className="grid gap-6 xl:grid-cols-3">

        <div className="xl:col-span-2 space-y-6">
          {brief}
          {journal}
        </div>

        <div className="space-y-6">
          {actions}
          {instruments}
        </div>

      </section>

    </main>
  );
}