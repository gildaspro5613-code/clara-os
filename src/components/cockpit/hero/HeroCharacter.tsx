/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroCharacter.tsx
 * Responsibility :
 * Displays Clara inside the Hero section.
 * ============================================
 */

import Image from "next/image";

/**
 * Hero character.
 */
export default function HeroCharacter() {

  return (

    <div className="relative flex items-end justify-center">

      <Image
        src="/images/clara/summer/Clara.png"
        alt="Clara"
        width={520}
        height={720}
        priority
        className="h-auto w-full max-w-md object-contain"
      />

    </div>

  );

}