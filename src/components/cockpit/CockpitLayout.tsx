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
  /** The full-screen hero scene (Clara's office). */
  hero: ReactNode;
}

/**
 * Root layout for Clara's Cockpit.
 *
 * The office is the primary experience. The hero occupies the full viewport
 * and is the only rendered surface. Invisible overlay zones are reserved for
 * future components (Clara, Brief, floating widgets, quick actions) — they
 * will be layered on top of the hero without disturbing the office atmosphere.
 */
export default function CockpitLayout({ hero }: CockpitLayoutProps) {
  return (
    <main className="relative">

      {/* Office — primary experience */}
      {hero}

      {/* Overlay zones — reserved for future components, currently invisible */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">

        {/* Clara presence zone */}
        <div className="absolute bottom-0 left-0 h-full w-1/4" />

        {/* Brief zone */}
        <div className="absolute top-0 right-0 h-1/2 w-80" />

        {/* Quick-actions zone */}
        <div className="absolute bottom-0 right-0 h-24 w-full" />

        {/* Floating widgets zone */}
        <div className="absolute top-0 left-0 h-40 w-full" />

      </div>

    </main>
  );
}