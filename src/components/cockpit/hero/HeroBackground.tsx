import Image from "next/image";

export default function HeroBackground() {
  return (
    <Image
      src="/cockpit/summer/Cockpit.png"
      alt="Bureau de Clara"
      fill
      priority
      className="object-cover"
    />
  );
}