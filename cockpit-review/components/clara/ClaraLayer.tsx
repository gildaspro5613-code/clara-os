/**
 * ============================================
 * CLARA OS
 * Clara Module
 *
 * File : ClaraLayer.tsx
 * ============================================
 */

import Image from "next/image";

export default function ClaraLayer() {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: "22%",
        bottom: "0",
      }}
    >
      <Image
        src="/clara/master/Clara_Master.png"
        alt="Clara"
        width={1536}
        height={1024}
        priority
      />
    </div>
  );
}