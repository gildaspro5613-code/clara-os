/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Stage.tsx
 * Responsibility :
 * Visual stage composition for the Hero.
 * Positions overlay panels above the cockpit.
 * ============================================
 */

import BriefPanel from "@/components/cockpit/panels/BriefPanel";

/**
 * Presentation-only Hero stage.
 * Arranges floating panels with absolute positioning.
 */
export default function Stage() {
  return (
    <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
      <div className="w-full max-w-sm mx-6 sm:mx-10 md:mr-16 lg:mr-24">
        <BriefPanel />
      </div>
    </div>
  );
}
