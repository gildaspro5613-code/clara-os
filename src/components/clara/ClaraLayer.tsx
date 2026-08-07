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
 *
 * Position derived from docs/design/cockpit_master.png:
 * center X ≈ 44 % of the hero artboard width.
 * ============================================
 */

import Image from "next/image";

export default function ClaraLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute bottom-0"
        style={{ left: "18%", width: "52%", maxWidth: "790px" }}
      >
        <Image
          src="/clara/master/Clara_Master.png"
          alt="Clara"
          width={790}
          height={1020}
          priority
          className="h-auto w-full select-none object-contain"
        />
      </div>
    </div>
  );
}