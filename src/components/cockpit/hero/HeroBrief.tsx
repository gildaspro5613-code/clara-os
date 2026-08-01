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

import { createSession } from "@/lib/core";
import { buildMessage } from "@/lib/clara";

export default function HeroBrief() {

  const session = createSession();

  return (
    <div className="space-y-4">

      <div>

        <h1 className="text-4xl font-bold tracking-tight text-white">
          Bonjour Gildas 👋
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300 whitespace-pre-line">
          {buildMessage(session)}
        </p>

      </div>

    </div>
  );
}