/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ClaraLayer.tsx
 * Responsibility :
 * Renders Clara's visual presence over the cockpit
 * background. Presentation only — no business logic.
 * ============================================
 */

import Image from "next/image";

const claraStyles = `
  @keyframes clara-rise {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .clara-enter {
    animation: clara-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
`;

/**
 * ClaraLayer overlays Clara's figure on the cockpit hero.
 * Positioned at the bottom-left, she emerges from below
 * with a soft entrance animation.
 */
export default function ClaraLayer() {
  return (
    <>
      <style>{claraStyles}</style>

      {/* Ambient gradient behind Clara for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-[52%] h-full
                   bg-gradient-to-r from-black/30 via-black/10 to-transparent"
      />

      {/* Clara's figure */}
      <div className="clara-enter pointer-events-none absolute bottom-0 left-0 w-[47%] h-full flex items-end">
        <div className="relative w-full h-full">
          <Image
            src="/images/clara/summer/Clara.png"
            alt="Clara — votre collaboratrice IA"
            fill
            priority
            className="object-contain object-bottom"
            sizes="47vw"
          />
        </div>
      </div>
    </>
  );
}
