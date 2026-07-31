import Image from "next/image";

export default function HeroCharacter() {
  return (
    <div className="absolute inset-0 flex items-end justify-center">
      <Image
        src="/images/clara/summer/hero.png"
        alt="Clara"
        width={520}
        height={620}
        priority
        className="object-contain"
      />
    </div>
  );
}