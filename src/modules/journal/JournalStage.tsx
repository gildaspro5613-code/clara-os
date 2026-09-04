import type { JournalEntry } from "@/lib/core/journal-entry";
import { getLocale, getTranslations } from "next-intl/server";

interface JournalStageProps {
  entries: readonly JournalEntry[];
}

export default async function JournalStage({
  entries,
}: JournalStageProps) {
  const t = await getTranslations("journalPage");
  const locale = await getLocale();
  const latestEntry = entries.at(-1);

  const entryTypes = Array.from(
    new Set(entries.map((entry) => entry.type)),
  );

  function typeLabel(type: JournalEntry["type"]) {
    switch (type) {
      case "SYSTEM":
        return t("types.system");
      case "COGNITIVE":
        return t("types.cognitive");
      case "ACTION":
        return t("types.action");
      case "LEARNING":
        return t("types.learning");
      default:
        return type;
    }
  }

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-white/10 pb-8">
          <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">
            CLARA OS
          </span>

          <h1 className="mt-3 text-4xl font-medium tracking-tight">
            {t("title")}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            {t("subtitle")}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            {entries.length === 0 ? (
              <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-8">
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  {t("title")}
                </span>

                <p className="mt-4 text-sm leading-6 text-white/50">
                  {t("empty")}
                </p>
              </article>
            ) : (
              entries
                .slice()
                .reverse()
                .map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.025] p-7"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                          {typeLabel(entry.type)}
                        </span>

                        <h2 className="mt-3 text-lg font-medium text-white/90">
                          {entry.summary}
                        </h2>
                      </div>

                      <time
                        dateTime={entry.createdAt.toISOString()}
                        className="shrink-0 text-xs text-white/30"
                      >
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(entry.createdAt)}
                      </time>
                    </div>

                    {entry.details && (
                      <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55">
                        {entry.details}
                      </p>
                    )}
                  </article>
                ))
            )}
          </section>

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:sticky lg:top-8">
            <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
              {t("context")}
            </span>

            <div className="mt-7">
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("entries")}
                </span>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  {t("entryCount", { count: entries.length })}
                </p>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("latestActivity")}
                </span>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  {latestEntry
                    ? latestEntry.summary
                    : t("noActivityRecorded")}
                </p>

                {latestEntry && (
                  <p className="mt-1 text-xs text-white/30">
                    {typeLabel(latestEntry.type)}
                  </p>
                )}
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {t("activities")}
                </span>

                <div className="mt-3 flex flex-wrap gap-2">
                  {entryTypes.length > 0 ? (
                    entryTypes.map((type) => (
                      <span
                        key={type}
                        className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/50"
                      >
                        {typeLabel(type)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/35">
                      {t("noActivity")}
                    </span>
                  )}
                </div>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">
                  Clara
                </span>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  {t("claraHelp")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
