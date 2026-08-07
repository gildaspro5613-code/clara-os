/**
 * ============================================
 * CLARA OS
 * Life Module
 * --------------------------------------------
 * File : LifeLayer.tsx
 * Responsibility :
 * Provides Clara's visual life state.
 * This layer exposes CSS classes describing
 * Clara's current presence without containing
 * any business logic.
 * ============================================
 */

export type LifeState =
  | "idle"
  | "thinking"
  | "listening"
  | "speaking"
  | "working";

export interface LifeLayerProps {
  /** Current visual state of Clara. */
  state?: LifeState;

  /** Components rendered inside the life layer. */
  children: React.ReactNode;
}

/**
 * Presentation-only layer.
 * Converts Clara's visual state into CSS classes.
 */
export default function LifeLayer({
  state = "idle",
  children,
}: LifeLayerProps) {
  const animation = {
    idle: "animate-clara-breathe",
    thinking: "animate-clara-thinking",
    listening: "animate-clara-listening",
    speaking: "animate-clara-speaking",
    working: "animate-clara-thinking",
  }[state];

  return (
    <div
      className={[
        "absolute",
        "inset-0",
        "pointer-events-none",
        "transition-all",
        "duration-500",
        animation,
      ].join(" ")}
    >
      {children}
    </div>
  );
}