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

  /** Native Clara OS widgets rendered below the hero. */
  children?: ReactNode;
}

/**
 * Root layout for Clara's Cockpit.
 *
 * The Hero remains the primary full-screen experience.
 * Native Clara OS widgets are rendered after the Hero,
 * as the next functional layer of the Cockpit.
 */
export default function CockpitLayout({
  hero,
  children,
}: CockpitLayoutProps) {
  return (
    <main className="relative w-full flex-1">
      {/* Office — primary experience */}
      {hero}

      {/* Native Clara OS widgets */}
      {children}
    </main>
  );
}
