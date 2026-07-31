import HeroBackground from "./HeroBackground";
import HeroCharacter from "./HeroCharacter";

export default function HeroScene() {
  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded-3xl">
      <HeroBackground />
      <HeroCharacter />
    </div>
  );
}