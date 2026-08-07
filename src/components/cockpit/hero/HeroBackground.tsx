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
 * Renders the official cockpit office image as a full-cover backdrop.
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="/cockpit/summer/cockpit.png"
        alt=""
        width={1536}
        height={1024}
        priority
        className="h-[1024px] w-[1536px] object-none"
      />
    </div>
  );
}