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

import GlassPanel from "@/components/ui/GlassPanel";
import HeroBackground from "./HeroBackground";

/**
 * Clara's office Hero.
 * The cockpit image is the permanent backdrop.
 * A GlassPanel floats over the office to establish
 * the visual language of Clara OS.
 */
export default function Hero() {
  return (
    <section className="relative w-full min-h-[560px] overflow-hidden">
      <HeroBackground />

      {/* Greeting panel — floats over the office, right side to keep Clara's face visible */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <div className="w-full max-w-sm mx-6 sm:mx-10 md:mr-16 lg:mr-24">
          <GlassPanel className="px-8 py-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-6">
              Clara OS
            </p>

            <h2 className="text-2xl font-light text-white/90 leading-snug mb-3">
              Bonjour Gildas.
            </h2>

            <p className="text-base text-white/70 leading-relaxed mb-6">
              J&rsquo;ai préparé votre journée.
            </p>

            <p className="text-sm text-white/55 leading-relaxed mb-8">
              Deux sujets méritent votre attention.
            </p>

            <p className="text-sm font-medium text-white/80">
              Souhaitez-vous commencer&nbsp;?
            </p>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}