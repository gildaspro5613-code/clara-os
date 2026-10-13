import { useTranslations } from "next-intl";
import MainLayout from "@/components/layout/MainLayout";
import ConnectionsHub from "@/components/connections/ConnectionsHub";

export default function ConnexionsPage() {
  const ui = useTranslations("ui");

  return (
    <MainLayout>
      <main className="min-h-full w-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 border-b border-white/10 pb-8">
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{ui("connect")}</span>
            <h1 className="mt-3 text-4xl font-medium tracking-tight">{ui("connections")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">{ui("accountsAndServicesLinkedToClaraOSWithTheir")}</p>
          </header>
          <ConnectionsHub />
        </div>
      </main>
    </MainLayout>
  );
}
