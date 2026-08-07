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

const COCKPIT_CANVAS_RATIO = 1536 / 1024;

const canvasStyle = {
  width: `max(100vw, calc(100vh * ${COCKPIT_CANVAS_RATIO}))`,
  height: `max(100vh, calc(100vw / ${COCKPIT_CANVAS_RATIO}))`,
};

export default function ClaraLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 relative"
        style={{
          ...canvasStyle,
          transform: "translate(-50%, -50%)",
        }}
      >
        <Image
          src="/clara/master/Clara_Master.png"
          alt="Clara"
          fill
          priority
          sizes="100vw"
          className="select-none object-cover"
        />
      </div>
    </div>
  );
}