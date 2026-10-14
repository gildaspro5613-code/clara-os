import { useTranslations } from "next-intl";
import GlassPanel from "@/components/ui/GlassPanel";
import type { ClaraSession } from "@/lib/core/session";
import { cockpitEmails } from "@/lib/presentation/cockpit-summary";

export default function EmailSummaryPanel({ session }: { session: ClaraSession }) {
  const ui = useTranslations("ui");
  const emails = cockpitEmails(session);
  if (!emails.length) return null;
  return <GlassPanel title={ui("emailSummary")}>
    <p className="mb-3 text-xs text-white/45">{ui("localizedSummary")}</p>
    <ul className="space-y-3">{emails.map(email => <li key={email.id} className="rounded-xl border border-white/10 p-3 text-sm">
      <p>{ui("from")} {email.sender ?? ui("toBeCompleted")}</p>
      <p>{ui("subjectLabel77")} {email.subject ?? ui("toBeCompleted")}</p>
      <p className="my-2 text-xs text-white/55">{ui("priorityLabel")}: {email.important ? ui("importantEmail") : ui("unknownPriority")}</p>
      <a href={email.href} target="_blank" rel="noopener noreferrer" className="text-cyan-300">{ui("openSourceEmail")} →</a>
    </li>)}</ul>
    <p className="mt-3 text-xs text-white/45">Gmail · {ui("sourceOriginal")}</p>
  </GlassPanel>;
}
