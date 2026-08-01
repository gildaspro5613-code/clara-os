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
  createSession,
} from "@/lib/core";

export default function HeroScene() {

  const session = createSession();

  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center">

      <HeroCharacter />

      <div className="space-y-6">

        <ClaraStatus
          state={session.state}
        />

      </div>

    </div>
  );
}