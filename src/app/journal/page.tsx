import MainLayout from "@/components/layout/MainLayout";
import JournalStage from "@/modules/journal/JournalStage";
import { getRuntime } from "@/lib/core/runtime";

export default function JournalPage() {
  const entries = getRuntime().getJournal();

  return (
    <MainLayout>
      <JournalStage entries={entries} />
    </MainLayout>
  );
}
