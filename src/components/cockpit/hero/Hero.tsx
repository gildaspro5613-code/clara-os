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
    <section className="relative h-full w-full overflow-auto bg-black">
      <div className="relative h-[1024px] w-[1536px] overflow-hidden">
        <HeroBackground />
        <ClaraLayer />
        <Stage />
      </div>
    </section>
  );
}