/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroCharacter.tsx
 * Responsibility :
 * Renders Clara's character inside the Hero section.
 * She is placed on the left side of the office scene,
 * naturally integrated into the background.
 * Prepared for future entrance animations.
 * ============================================
 */

import Image from "next/image";

/** Native dimensions of Clara.png (1535 × 1024). */
const CLARA_NATIVE_WIDTH = 1535;
const CLARA_NATIVE_HEIGHT = 1024;

/**
 * Clara's character overlay inside the Hero scene.
 *
 * Positioned at the bottom-left of the office, she blends
 * naturally into the cockpit background without appearing
 * as a floating widget or dashboard element.
 */
export default function HeroCharacter() {
  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: `${CLARA_NATIVE_WIDTH} / ${CLARA_NATIVE_HEIGHT}` }}
      data-scene-actor="clara"
    >
      <Image
        src="/images/clara/summer/Clara.png"
        alt="Clara"
        fill
        priority
        draggable={false}
        className="object-contain object-bottom"
        sizes="(max-width: 1024px) 100vw, 420px"
      />
    </div>
  );
}