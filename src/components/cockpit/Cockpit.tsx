/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Cockpit.tsx
 * Responsibility :
 * Main entry point for Clara's Cockpit.
 * Boots the Clara runtime on mount and holds
 * the active session for the application lifetime.
 * ============================================
 */

"use client";

import { useEffect, useRef } from "react";

import { startRuntime } from "@/lib/core";
import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";

export default function Cockpit() {

  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startRuntime();
  }, []);

  return (
    <CockpitLayout hero={<Hero />} />
  );
}