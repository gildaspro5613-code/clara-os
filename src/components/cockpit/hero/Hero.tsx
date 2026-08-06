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

import Stage from "@/components/cockpit/Stage";
import HeroBackground from "./HeroBackground";

/**
 * Clara's office Hero.
 * The cockpit image is the permanent backdrop.
 * A briefing panel floats over the office to
 * establish the visual language of Clara OS.
 */
export default function Hero() {
  return (
    <section className="relative w-full min-h-[560px] overflow-hidden">
      <HeroBackground />
      <Stage />
    </section>
  );
}