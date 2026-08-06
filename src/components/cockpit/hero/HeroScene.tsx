/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroScene.tsx
 * Responsibility :
 * Defines the overlay layout structure above the
 * cockpit background. Hosts all future Hero overlay
 * containers (character, brief, actions, widgets).
 * ============================================
 */

import HeroCharacter from "./HeroCharacter";
import HeroBrief from "./HeroBrief";
import HeroActions from "./HeroActions";
import HeroWidgets from "./HeroWidgets";

/**
 * Full-height scene overlay composing all Hero regions.
 * Desktop-first responsive grid:
 *   - Left column  : character
 *   - Right column : brief + actions + widgets
 */
export default function HeroScene() {
  return (
    <div className="relative z-10 flex h-full min-h-[560px] flex-col lg:grid lg:grid-cols-[420px_1fr] lg:gap-8 lg:items-end">

      {/* Left – character overlay */}
      <div className="flex items-end justify-center self-end">
        <HeroCharacter />
      </div>

      {/* Right – content overlays */}
      <div className="flex flex-col justify-end gap-6 pb-8 pr-8 pt-8">
        <HeroBrief />
        <HeroActions />
        <HeroWidgets />
      </div>

    </div>
  );
}