import { test } from "node:test";
import assert from "node:assert/strict";
import { responseLanguageInstruction, safeResponseLocale } from "../i18n/response-language";
import { locales } from "../i18n/config";

const dictionaries = ["index", "journal", "missions", "automations-brevo", "automations-make"] as const;

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key));
}

test("all five locale dictionaries share identical keys", async () => {
  for (const dictionary of dictionaries) {
    const baseline = await import(`../i18n/messages/fr/${dictionary}.json`);
    const expected = flatten(baseline.default).sort();
    for (const locale of locales) {
      const translated = await import(`../i18n/messages/${locale}/${dictionary}.json`);
      assert.deepEqual(flatten(translated.default).sort(), expected, `${locale}/${dictionary}`);
    }
  }
});

test("Clara response language covers every supported locale", () => {
  for (const locale of locales) {
    assert.ok(responseLanguageInstruction(locale).length > 40);
    assert.equal(safeResponseLocale(locale), locale);
  }
  assert.equal(safeResponseLocale("xx"), "fr");
  assert.equal(safeResponseLocale(null), "fr");
});
