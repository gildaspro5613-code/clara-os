/**
 * ============================================
 * CLARA OS
 * UI Module
 * --------------------------------------------
 * File : GlassPanel.tsx
 * Responsibility :
 * Official premium glass container.
 * Every cockpit panel inherits from this
 * component.
 * ============================================
 */

import { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({
  title,
  children,
  className = "",
}: GlassPanelProps) {
  return (
    <section
      className={`
        rounded-[30px]

        border
        border-white/10

        bg-black/30

        backdrop-blur-[28px]

        shadow-[0_20px_60px_rgba(0,0,0,0.30)]

        p-6

        text-white

        transition-all
        duration-300

        ${className}
      `}
    >
      {title && (
        <h2 className="mb-5 text-xs uppercase tracking-[0.30em] text-white/80">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
}