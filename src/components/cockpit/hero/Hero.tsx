/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Hero.tsx
 * Responsibility :
 * Main hero section of Clara OS.
 * Clara's office: cockpit background with overlay
 * containers positioned above it.
 * ============================================
 */

import HeroBackground from "./HeroBackground";

/**
 * Clara's office Hero.
 * The cockpit image is the permanent backdrop.
 */
export default function Hero() {
  return (
    <section className="relative w-full min-h-[560px] overflow-hidden">
      <HeroBackground />
    </section>
  );
}