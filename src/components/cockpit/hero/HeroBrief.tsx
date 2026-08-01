/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroBrief.tsx
 * Responsibility :
 * Displays Clara's daily briefing.
 * ============================================
 */

import { getSession } from "@/lib/core";
import { buildMessage } from "@/lib/clara";

export default function HeroBrief() {

  const session = getSession();

  return (
    <div className="space-y-4">

      <div>

        <h1 className="text-4xl font-bold tracking-tight text-white">
          Bonjour Gildas 👋
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-relaxed whitespace-pre-line text-slate-300">
          {buildMessage(session)}
        </p>

      </div>

    </div>
  );
}