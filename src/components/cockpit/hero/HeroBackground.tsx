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
 * Presentation-only Hero background.
 * Renders the cockpit office image as a full-cover backdrop with a subtle dark layer
 * to preserve foreground readability.
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">
      <Image
        src="/cockpit/summer/cockpit.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}