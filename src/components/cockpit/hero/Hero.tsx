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
import HeroScene from "./HeroScene";

/**
 * Clara's office Hero.
 * The cockpit image is the permanent backdrop.
 * All UI elements float above it via HeroScene.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl">

      {/* Permanent cockpit office background */}
      <HeroBackground />

      {/* Overlay layout for all future Hero regions */}
      <HeroScene />

    </section>
  );
}