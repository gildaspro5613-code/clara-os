/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ClaraStatus.tsx
 * Responsibility :
 * Displays Clara's current operational state.
 * ============================================
 */

import { ClaraState } from "@/lib/core";

export interface ClaraStatusProps {
  state: ClaraState;
}

export default function ClaraStatus({
  state,
}: ClaraStatusProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-slate-400">
        Clara
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-emerald-500" />

        <span className="font-medium text-white">
          {state}
        </span>
      </div>
    </div>
  );
}