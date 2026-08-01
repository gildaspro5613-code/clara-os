/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroScene.tsx
 * Responsibility :
 * Displays Clara and her current status.
 * ============================================
 */

import HeroCharacter from "./HeroCharacter";
import ClaraStatus from "@/components/clara/ClaraStatus";

import {
  getSession,
} from "@/lib/core";

export default function HeroScene() {

  const session = getSession();

  return (
    <div className="grid gap-8 items-center lg:grid-cols-2">

      <HeroCharacter />

      <div className="space-y-6">

        <ClaraStatus
          state={session.state}
        />

      </div>

    </div>
  );
}