import MainLayout from "@/components/layout/MainLayout";
import ClaraChatWidget from "@/components/cockpit/widgets/clara/ClaraChatWidget";

export const dynamic = "force-dynamic";

export default function ConversationsPage() {
  return (
    <MainLayout>
      <div className="w-full px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-400">
              Opérer
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Conversations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
              Ton espace de conversation avec Clara, connecté à son contexte
              opérationnel.
            </p>
          </div>

          <div className="max-w-5xl">
            <ClaraChatWidget />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
