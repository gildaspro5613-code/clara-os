/** Historical mailbox workflow receipts are not dialogue turns.
 * Keep stored history intact; only hide the exact legacy synthetic notices
 * in the conversation surfaces. Mail drafts remain accessible in Messagerie.
 */
const notices = new Set([
  'Brouillon email préparé. Choisissez la boîte autorisée pour le relire ; aucun envoi effectué.',
  'Email draft prepared. Select the authorized mailbox to review it; nothing has been sent.',
  'Borrador preparado. Seleccione el buzón autorizado para revisarlo; no se ha enviado nada.',
  'E-Mail-Entwurf vorbereitet. Wählen Sie das autorisierte Postfach zur Prüfung; nichts wurde gesendet.',
  'Bozza email preparata. Seleziona la casella autorizzata per verificarla; nessun invio effettuato.',
]);
export const isLegacyMailDraftChatNotice=(message:{role:string;content:string})=>
  message.role==='clara'&&notices.has(message.content.trim());
