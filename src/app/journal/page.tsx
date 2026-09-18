import MainLayout from "@/components/layout/MainLayout";
import JournalStage from "@/modules/journal/JournalStage";
import { getRuntime } from "@/lib/core/runtime";
import { listBrevoEvents } from "@/lib/connectors/brevo/event-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { JournalEntryType, type JournalEntry } from "@/lib/core/journal-entry";

const labels: Record<string,string> = {
  sent:"Email envoyé", delivered:"Email délivré", opened:"Email ouvert", click:"Lien cliqué",
  hard_bounce:"Échec permanent", soft_bounce:"Échec temporaire", blocked:"Email bloqué", unsubscribed:"Désinscription",
};

export default async function JournalPage() {
  const runtimeEntries = getRuntime().getJournal();
  let brevoEntries: JournalEntry[] = [];
  try {
    const events = await listBrevoEvents(CURRENT_WORKSPACE_ID);
    brevoEntries = events.map(event=>({
      id:`brevo-${event.id}`, type:JournalEntryType.ACTION, createdAt:event.occurredAt,
      summary:`Brevo · ${labels[event.event] ?? event.event}`,
      details:[event.email, event.campaignId!==undefined?`Campagne #${event.campaignId}`:undefined, event.messageId].filter(Boolean).join(" · "),
    }));
  } catch { /* Journal remains available even if Brevo storage is unavailable. */ }
  const entries=[...runtimeEntries,...brevoEntries].sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime());
  return <MainLayout><JournalStage entries={entries}/></MainLayout>;
}
