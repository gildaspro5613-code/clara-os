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
import CockpitLayout from "./CockpitLayout";

export default function Cockpit() {
  return (
    <CockpitLayout hero={<Hero />} />
  );
}