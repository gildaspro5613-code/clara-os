import type { ClaraSession } from "@/lib/core/session";

import Image from "next/image";
import Stage from "../Stage";

interface HeroProps {
  session: ClaraSession;
}

export default function Hero({
  session,
}: HeroProps) {
  return (
    <section className="relative h-full min-h-[720px] overflow-hidden">
      <Image
        src="/cockpit/cockpit-hero-final.png"
        alt="Clara OS"
        fill
        priority
        className="object-cover object-center"
      />

      <Stage session={session} />
    </section>
  );
}
