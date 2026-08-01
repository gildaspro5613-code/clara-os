/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : InstrumentCard.tsx
 * Responsibility :
 * Generic card used to display
 * an instrument inside the Cockpit.
 * ============================================
 */

import { ReactNode } from "react";

export interface InstrumentCardProps {
  title: string;
  children: ReactNode;
}

export default function InstrumentCard({
  title,
  children,
}: InstrumentCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-lg font-semibold text-white">
        {title}
      </h3>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}