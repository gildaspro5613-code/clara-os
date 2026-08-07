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
import cockpitMaster from "../../../../docs/design/cockpit_master.png";

/**
 * Presentation-only Hero background.
 * Renders the official cockpit office image as a full-cover backdrop.
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src={cockpitMaster}
        alt=""
        fill
        priority
        className="select-none object-none object-top-left"
        sizes="1536px"
      />
    </div>
  );
}