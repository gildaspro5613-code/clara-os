import type { ClaraSession } from "@/lib/core/session";

import Stage from "../Stage";

interface HeroProps {
  session: ClaraSession;
}

export default function Hero({ session }: HeroProps) {
  return (
    <section className="relative h-full min-h-[720px] overflow-hidden bg-[#020914]">
      {/*
        Clara OS is an operational workspace, not a marketing surface.
        The visual identity lives in light, depth and structure — no portrait
        or static representation of Clara belongs in the product Hero.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(6,182,212,0.11)_0%,rgba(8,47,73,0.08)_28%,rgba(2,9,20,0)_66%)]" />
        <div className="absolute inset-x-0 top-0 h-[46%] bg-[linear-gradient(180deg,rgba(14,116,144,0.08),rgba(2,9,20,0))]" />
        <div className="absolute -left-[12%] top-[18%] h-[52%] w-[52%] rounded-full bg-cyan-400/[0.035] blur-[120px]" />
        <div className="absolute -right-[10%] top-[6%] h-[58%] w-[46%] rounded-full bg-sky-500/[0.04] blur-[140px]" />

        {/* Quiet architectural depth, inherited from the Clara OS website identity. */}
        <div className="absolute left-1/2 top-[9%] h-[72%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/[0.08] to-transparent" />
        <div className="absolute left-[7%] right-[7%] top-[52%] h-px bg-gradient-to-r from-transparent via-cyan-300/[0.07] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-[linear-gradient(180deg,rgba(2,9,20,0),rgba(1,6,14,0.72))]" />
      </div>

      <Stage session={session} />
    </section>
  );
}
