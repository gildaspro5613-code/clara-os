import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {isLegacyMailDraftChatNotice} from '@/lib/native/mail/chat-notice-filter';

const notices=[
 'Brouillon email préparé. Choisissez la boîte autorisée pour le relire ; aucun envoi effectué.',
 'Email draft prepared. Select the authorized mailbox to review it; nothing has been sent.',
 'Borrador preparado. Seleccione el buzón autorizado para revisarlo; no se ha enviado nada.',
 'E-Mail-Entwurf vorbereitet. Wählen Sie das autorisierte Postfach zur Prüfung; nichts wurde gesendet.',
 'Bozza email preparata. Seleziona la casella autorizzata per verificarla; nessun invio effettuato.',
];
test('historical email draft receipts are filtered only in Clara dialogue, never other messages',()=>{
 for(const content of notices){
  assert.equal(isLegacyMailDraftChatNotice({role:'clara',content}),true);
  assert.equal(isLegacyMailDraftChatNotice({role:'user',content}),false);
 }
 for(const content of ['Le brouillon a été préparé pour vous.', 'Bonjour, comment puis-je vous aider ?', '', 'Brouillon email préparé.']){
  assert.equal(isLegacyMailDraftChatNotice({role:'clara',content}),false);
 }
});

test('mail draft preparation no longer persists synthetic chat turns',()=>{
 const source=readFileSync('src/lib/native/mail.ts','utf8');
 const section=source.slice(source.indexOf(' async prepare('),source.indexOf(' async saveDraft('));
 assert.ok(section.includes('this.saveDraft('),'draft must still be saved in the authorized mailbox workflow');
 assert.ok(!section.includes('ctx.session.conversation='),'mail workflow must not append dialogue');
});

test('chat textarea scrollbar is cyan with dark track, and history display hides only legacy receipts',()=>{
 const css=readFileSync('src/app/globals.css','utf8');
 const widget=readFileSync('src/components/cockpit/widgets/clara/ClaraChatWidget.tsx','utf8');
 const earlier=readFileSync('src/components/native/NativeEarlierMessages.tsx','utf8');
 assert.match(css,/\.clara-chat-input\s*\{[^}]*color-scheme:\s*dark;[^}]*scrollbar-color:\s*#22b8d6\s+#0b1524;/);
 assert.match(css,/\.clara-chat-input::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*#22b8d6/);
 assert.match(widget,/className="clara-workspace-scroll clara-chat-input/);
 assert.match(widget,/messages\.filter\(message=>!isLegacyMailDraftChatNotice\(message\)\)/);
 assert.match(earlier,/messages\.filter\(m=>!isLegacyMailDraftChatNotice\(m\)\)/);
});
