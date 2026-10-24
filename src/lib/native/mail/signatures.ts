/**
 * Mélodie Digital email identity signatures — isolated, read-only preparation.
 *
 * Source design: melodie-digital-site PR #21.
 * No SMTP/IMAP, approval, delegation, persistence or draft mutation here.
 * This registry is intentionally opt-in until the native mail draft contract
 * can safely render HTML with a text/plain fallback.
 */
export type SignatureLocale = 'fr' | 'en' | 'es' | 'de' | 'it';
export type SignatureIdentity = 'clara' | 'gildas' | 'support' | 'contact' | 'info';

type Translated = Record<SignatureLocale, string>;
type SignatureProfile = {
  email: string;
  name: string | Translated;
  role: Translated;
};
import registry from './signatures-source.json';
const profiles = registry.identities as Record<SignatureIdentity, SignatureProfile & {location:string}>;
const logoUrl = registry.logoUrl;
const website = registry.web;
const esc = (value:string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const localized = (value:string|Translated, locale:SignatureLocale) => typeof value==='string'?value:value[locale];
const emailIdentity = (sender:string): SignatureIdentity|null => {
  const normalized=sender.trim().toLowerCase();
  return (Object.keys(profiles) as SignatureIdentity[]).find(id=>profiles[id].email===normalized) ?? null;
};
export function resolveMailSignature(sender:string, locale:SignatureLocale) {
  const identity=emailIdentity(sender);
  if(!identity) return null; // Never silently misattribute a personal/external mailbox.
  const p=profiles[identity], name=localized(p.name,locale), role=p.role[locale];
  const location=registry.locations[p.location as keyof typeof registry.locations];
  if(!location) return null;
  const address=location.lines.join(' · ');
  const text=[name,role,'Mélodie Digital',p.email,'melodie.digital',address].join('\n');
  const html=`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#173247;max-width:540px;"><tr><td style="padding:0 18px 0 0;vertical-align:top;border-right:2px solid #41cfff;"><a href="${esc(website)}" style="text-decoration:none;"><img src="${esc(logoUrl)}" width="110" alt="Mélodie Digital" style="width:110px;max-width:110px;height:auto;display:block;border:0;"></a></td><td style="padding:0 0 0 18px;vertical-align:top;font-size:13px;line-height:1.5;"><strong style="font-size:17px;color:#071f32;">${esc(name)}</strong><br><span style="color:#49677b;">${esc(role)}</span><br><strong style="color:#071f32;">Mélodie Digital</strong><br><a href="mailto:${esc(p.email)}" style="color:#087b9f;text-decoration:none;">${esc(p.email)}</a><br><a href="${esc(website)}" style="color:#087b9f;text-decoration:none;">melodie.digital</a><br><span style="color:#49677b;">${esc(address)}</span></td></tr></table>`;
  return {identity, sender:p.email, locale, text, html};
}
