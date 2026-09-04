/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : request.ts
 * Responsibility : Server-side locale resolution for next-intl.
 * Reads the active locale from the NEXT_LOCALE cookie,
 * falling back to the default locale when absent or invalid.
 * ============================================
 */

import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  const [baseMessagesModule, journalMessagesModule] = await Promise.all([
    import(`./messages/${locale}/index.json`),
    import(`./messages/${locale}/journal.json`),
  ]);

  const baseMessages = baseMessagesModule.default as Record<string, unknown>;
  const journalMessages = journalMessagesModule.default as Record<string, unknown>;

  return {
    locale,
    messages: {
      ...baseMessages,
      journalPage: journalMessages,
    },
    // next-intl will silently fall back to the key name when a message
    // is missing — no exception thrown, no empty UI.
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[next-intl]", error.message);
      }
    },
    getMessageFallback({ key, namespace }) {
      return `${namespace}.${key}`;
    },
  };
});
