/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Cockpit.tsx
 * Responsibility :
 * Main entry point for Clara's Cockpit.
 * ============================================
 */

import Hero from "./hero/Hero";
import Brief from "./Brief";
import Journal from "./Journal";
import QuickActions from "./QuickActions";
import Instruments from "./Instruments";
import CockpitLayout from "./CockpitLayout";

export default function Cockpit() {
  return (
    <CockpitLayout
      hero={<Hero />}
      brief={<Brief />}
      journal={<Journal />}
      actions={<QuickActions />}
      instruments={<Instruments />}
    />
  );
}