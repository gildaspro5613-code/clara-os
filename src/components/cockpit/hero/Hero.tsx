/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Hero.tsx
 * Responsibility :
 * Main hero section of Clara OS.
 * Composes the Hero interface.
 * ============================================
 */

import HeroBackground from "./HeroBackground";
import HeroScene from "./HeroScene";
import HeroBrief from "./HeroBrief";
import HeroActions from "./HeroActions";

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl">

      <HeroBackground />

      <div className="relative z-10 p-8">

        <HeroScene />

        <div className="mt-8 space-y-6">

          <HeroBrief />

          <HeroActions />

        </div>

      </div>

    </section>
  );
}