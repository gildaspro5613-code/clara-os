import Image from "next/image";
import Stage from "../Stage";

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/cockpit/cockpit-hero-final.png"
          alt="Clara OS Cockpit"
          fill
          priority
          className="object-cover"
        />
      </div>

      <Stage />
    </section>
  );
}
