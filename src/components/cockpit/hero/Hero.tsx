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

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
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

      {/* Greeting panel — floats over the office, right side to keep Clara's face visible */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <div className="w-full max-w-sm mx-6 sm:mx-10 md:mr-16 lg:mr-24">
          <BriefPanel />
        </div>
      </div>
    </section>
  );
}