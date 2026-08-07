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
import ClaraLayer from "@/components/clara/ClaraLayer";
import Stage from "@/components/cockpit/Stage";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">

      {/* Official cockpit background */}
      <HeroBackground />

      {/* Clara */}
      <ClaraLayer />

      {/* Cockpit interface */}
      <Stage />

    </section>
  );
}