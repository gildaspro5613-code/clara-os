import Image from "next/image";
import Stage from "../Stage";

import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
interface HeroProps {session:ClaraSession;acquisition?:AcquisitionRecord|null;nativeScope?:boolean;}

export default function Hero({session,acquisition,nativeScope=false}:HeroProps) {
  return (
    <section data-cockpit-hero className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/cockpit/cockpit-hero-final.png"
          alt="Clara OS Cockpit"
          fill
          priority
          className="object-cover"
        />
      </div>

      <Stage session={session} acquisition={acquisition} nativeScope={nativeScope}/>
    </section>
  );
}
