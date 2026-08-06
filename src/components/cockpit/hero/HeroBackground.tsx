/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroBackground.tsx
 * Responsibility :
 * Renders the cockpit image as the permanent
 * background of Clara's office Hero.
 * ============================================
 */

import Image from "next/image";

/**
 * Renders the cockpit scene as the Hero background.
 * The image covers the entire Hero area without distortion.
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">

      {/* Cockpit office background */}
      <Image
        src="/cockpit/summer/Cockpit.png"
        alt="Clara's office"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Subtle dark veil to ensure overlay legibility */}
      <div className="absolute inset-0 bg-black/30" />

    </div>
  );
}