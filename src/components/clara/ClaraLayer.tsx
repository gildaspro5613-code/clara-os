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
      <div
        className="absolute bottom-0 left-1/2"
        style={{
          transform: "translateX(-30%)",
        }}
      >
        <Image
          src="/clara/master/Clara_Master.png"
          alt="Clara"
          width={790}
          height={1020}
          priority
          className="select-none object-contain"
        />
      </div>
    </div>
  );
}