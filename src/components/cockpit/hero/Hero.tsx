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
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 aspect-[1536/1024] h-full min-w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden">
          <HeroBackground />
        </div>
      </div>
    </section>
  );
}