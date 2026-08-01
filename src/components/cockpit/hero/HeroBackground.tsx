/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroBackground.tsx
 * Responsibility :
 * Renders the visual background of the Hero.
 * ============================================
 */

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Emerald glow */}
      <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      {/* Blue glow */}
      <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Grid overlay */}
      <div
        className="
          absolute inset-0
          opacity-10
          [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)]
          [background-size:48px_48px]
        "
      />

    </div>
  );
}