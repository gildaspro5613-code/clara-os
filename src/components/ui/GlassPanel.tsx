/**
 * ============================================
 * CLARA OS
 * UI Module
 * --------------------------------------------
 * File : GlassPanel.tsx
 * Responsibility :
 * Base visual component implementing the
 * glassmorphism design language of Clara OS.
 * Presentation only — no business logic.
 * ============================================
 */

import { ReactNode } from "react";

export interface GlassPanelProps {
  /** Content rendered inside the panel. */
  children: ReactNode;
  /** Additional Tailwind classes for layout customisation. */
  className?: string;
}

/**
 * GlassPanel — reusable glassmorphism surface.
 *
 * Provides an elegant frosted-glass backdrop with a subtle blur,
 * soft translucent border, and rounded corners.
 * It is purely presentational and accepts any children.
 */
export default function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={[
        "relative",
        "rounded-2xl",
        "border border-white/10",
        "bg-white/5",
        "backdrop-blur-md",
        "shadow-[0_4px_32px_rgba(0,0,0,0.25)]",
        "overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Inner highlight — top-edge shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {children}
    </div>
  );
}
