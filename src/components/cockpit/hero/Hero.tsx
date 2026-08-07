/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Hero.tsx
 * Responsibility :
 * Main Hero section of Clara OS.
 * Composes the official cockpit:
 *  - Background
 *  - Clara
 *  - Glass interface
 * ============================================
 */

import HeroBackground from "./HeroBackground";

export default function Hero() {
  return (
    <section className="relative h-full min-h-full w-full overflow-hidden bg-black">
      <div className="relative h-full w-full overflow-hidden">
        <HeroBackground />
      </div>
    </section>
  );
}