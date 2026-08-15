import Image from "next/image";

export default function ClaraLayer() {
  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: "35%",
        bottom: "0",
        width: "40%",
      }}
    >
      <Image
        src="/cockpit/clara-chair-transparent.png"
        alt="Clara"
        width={1536}
        height={1024}
        priority
        className="block h-auto w-full"
      />
    </div>
  );
}
