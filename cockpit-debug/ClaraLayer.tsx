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

/**
 * Hero reference:
 * 1536 x 1024
 */
const CLARA = {
  left: 320,
  bottom: 120,
  width: 820,
  height: 1060,
};

export default function ClaraLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute"
        style={{
          left: `${CLARA.left}px`,
          bottom: `${CLARA.bottom}px`,
        }}
      >
        <Image
          src="/clara/master/Clara_Master.png"
          alt="Clara"
          width={CLARA.width}
          height={CLARA.height}
          priority
          className="select-none object-contain"
        />
      </div>
    </div>
  );
}