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
    <section className="relative h-[1024px] w-[1536px] overflow-hidden">
      <div className="relative h-[1024px] w-[1536px] overflow-hidden">
        <HeroBackground />
      </div>
    </section>
  );
}