import HeroBackdrop from "./HeroBackdrop";
import type { Mission } from "@/modules/missions/types/Mission";
import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import Stage from "../Stage";

interface HeroProps {
  nativeScope?: boolean;
  nativeMissions?:Mission[];
  session: ClaraSession;
  acquisition?: AcquisitionRecord | null;
}

export default function Hero({ session, acquisition, nativeScope,nativeMissions }: HeroProps) {
  return (
    <section data-cockpit-hero className="relative h-auto min-h-0 overflow-hidden bg-[#020914] lg:h-full lg:min-h-[720px]">
      {/*
        Clara OS is an operational workspace. The Hero borrows the website's
        architectural language — grid, cyan geometry and depth — without
        importing its marketing content or Clara's visual identity.
      */}
      <HeroBackdrop/>

      <Stage nativeMissions={nativeMissions} nativeScope={nativeScope} session={session} acquisition={acquisition} />
    </section>
  );
}
