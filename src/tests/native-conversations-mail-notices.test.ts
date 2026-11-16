import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {isLegacyMailDraftChatNotice} from '@/lib/native/mail/chat-notice-filter';

test('Conversations page filters historical mail notifications in the current window',()=>{
 const page=readFileSync('src/app/conversations/page.tsx','utf8');
 assert.match(page,/session\.session\.conversation\.filter\(message=>!isLegacyMailDraftChatNotice\(message\)\)/);
 assert.match(page,/messages\.map\(\(message\)/);
 const entries=[
  {id:'1',role:'clara',content:'Brouillon email préparé. Choisissez la boîte autorisée pour le relire ; aucun envoi effectué.'},
  {id:'2',role:'clara',content:'Bonjour, voici notre projet.'},
  {id:'3',role:'user',content:'Brouillon email préparé. Choisissez la boîte autorisée pour le relire ; aucun envoi effectué.'}
 ];
 assert.deepEqual(entries.filter(e=>!isLegacyMailDraftChatNotice(e)).map(e=>e.id),['2','3']);
});

test('History pagination and chat retain the same legacy receipt filter without deletion',()=>{
 const past=readFileSync('src/components/native/NativeEarlierMessages.tsx','utf8');
 const cockpit=readFileSync('src/components/cockpit/widgets/clara/ClaraChatWidget.tsx','utf8');
 assert.match(past,/messages\.filter\(m=>!isLegacyMailDraftChatNotice\(m\)\)/);
 assert.match(cockpit,/messages\.filter\(message=>!isLegacyMailDraftChatNotice\(message\)\)/);
 assert.match(past,/beforeMessageId/);
});
