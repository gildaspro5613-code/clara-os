import type { ClaraSession } from "@/lib/core/session";

import Stage from "../Stage";

interface HeroProps {
  session: ClaraSession;
}

export default function Hero({ session }: HeroProps) {
  return (
    <section className="relative h-full min-h-[720px] overflow-hidden bg-[#020914]">
      {/*
        Clara OS is an operational workspace. The Hero borrows the website's
        architectural language — grid, cyan geometry and depth — without
        importing its marketing content or Clara's visual identity.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black_5%,black_72%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_52%_38%,rgba(6,182,212,0.10)_0%,rgba(8,47,73,0.055)_32%,rgba(2,9,20,0)_67%)]" />

        <div className="absolute left-[39%] top-[-36%] h-[118%] w-[58%] rounded-full border border-cyan-300/[0.08]" />
        <div className="absolute left-[51%] top-[-16%] h-[91%] w-[45%] rounded-full border border-cyan-300/[0.06]" />
        <div className="absolute right-[-15%] top-[8%] h-[64%] w-[46%] rounded-full border border-cyan-300/[0.07]" />

        <div className="absolute left-[46%] top-0 h-[78%] w-px bg-gradient-to-b from-cyan-300/[0.12] via-cyan-300/[0.05] to-transparent" />
        <div className="absolute left-[7%] right-[5%] top-[52%] h-px bg-gradient-to-r from-transparent via-cyan-300/[0.09] to-transparent" />

        <div className="absolute left-[7%] top-[9%] h-px w-[18%] bg-gradient-to-r from-cyan-300/[0.22] to-transparent" />
        <div className="absolute right-[6%] top-[10%] h-px w-[16%] bg-gradient-to-l from-cyan-300/[0.18] to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 h-[34%] bg-[linear-gradient(180deg,rgba(2,9,20,0),rgba(1,6,14,0.78))]" />
      </div>

      <Stage session={session} />
    </section>
  );
}
