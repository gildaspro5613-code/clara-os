import { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({
  title,
  children,
  className = "",
}: GlassPanelProps) {
  return (
    <section
      className={`
        relative
        overflow-hidden
        rounded-[24px]
        border border-white/[0.12]
        bg-black/30
        backdrop-blur-[24px]
        shadow-[0_12px_40px_rgba(0,0,0,0.18)]
        p-5
        text-white
        transition-all duration-300
        ${className}
      `}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70"
      />
      {title && (
        <h2 className="mb-4 text-xs uppercase tracking-[0.28em] text-white/75">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
}
