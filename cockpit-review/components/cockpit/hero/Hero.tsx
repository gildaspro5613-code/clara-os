/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Hero.tsx
 * Responsibility :
 * Official Hero composition.
 *
 * Layers:
 * 1. Background
 * 2. Clara
 * 3. Glass UI
 * ============================================
 */

import HeroBackground from "./HeroBackground";
import ClaraLayer from "@/components/clara/ClaraLayer";
import Stage from "../Stage";

export default function Hero() {
  return (
    <section className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[1024px]
            w-[1536px]
            -translate-x-1/2
            -translate-y-1/2
          "
        >
          <HeroBackground />

          <ClaraLayer />

          <Stage />
        </div>
      </div>
    </section>
  );
}