/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : ClaraLayer.tsx
 * Responsibility :
 * Renders Clara independently from the cockpit.
 * Clara remains a separate visual layer so she
 * can later be animated by the Life Engine.
 * ============================================
 */

import Image from "next/image";

export default function ClaraLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <Image
        src="/clara/master/Clara_Master.png"
        alt="Clara"
        width={1536}
        height={1024}
        priority
        className="h-[1024px] w-[1536px] select-none object-none"
      />
    </div>
  );
}