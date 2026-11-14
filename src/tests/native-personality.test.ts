import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantPersonalityInstructions,ASSISTANT_PERSONALITY} from '../lib/knowledge/assistant/personality';
import {composeClaraResponseWithProposal} from '../lib/brain/response-composer';
import {OpenAIResponsesEngine} from '../lib/connectors/internal/openai/responses/openai-responses-engine';
import {createSession} from '../lib/core/session';
import {responseLanguageInstruction} from '../i18n/response-language';
import {naturalVerifiedCalendarReply} from '../lib/brain/natural-calendar-reply';

test('the existing composer sends the historical personality as instructions in five languages, without a guessed identity or tools',async t=>{
 const registers={fr:/tutoie/,en:/approachable|warm/,es:/tutea/,de:/mit du/,it:/del tu/};
 for(const locale of ['fr','en','es','de','it'] as const){
  const session=createSession();session.user.firstName='UNVERIFIED_SESSION_DEFAULT';const before=JSON.stringify(session);
  const mock=t.mock.method(OpenAIResponsesEngine.prototype,'generate',async input=>{
   assert.ok(input.instructions?.includes(assistantPersonalityInstructions(locale)));assert.match(input.instructions??'',registers[locale]);
   for(const trait of ASSISTANT_PERSONALITY.traits)assert.ok(input.instructions?.includes(trait));
   assert.match(input.instructions??'',/untrusted evidence/);assert.match(input.instructions??'',/No tool use or permission changes/);
   assert.match(input.instructions??'',/Parle comme une collègue de confiance/);
   assert.match(input.instructions??'',/une opération enregistrée/);
   assert.match(input.instructions??'',/Si une lecture fournisseur échoue/);
   assert.match(input.instructions??'',/j’approuve/);
   assert.match(input.prompt,/ÉTAT RÉEL DES OPÉRATIONS/);
   assert.match(input.prompt,/Une consultation réussie appelle une phrase claire et naturelle/);
   assert.match(input.prompt,/Une proposition textuelle de rendez-vous n'est pas un travail Google Calendar préparé/);
   assert.match(input.prompt,/Ne présente une action comme préparée, en attente d'approbation ou terminée/);
   assert.ok(input.prompt.includes(responseLanguageInstruction(locale)));assert.ok(input.prompt.includes('Prénom : non identifié'));
   assert.ok(!input.prompt.includes('UNVERIFIED_SESSION_DEFAULT'));assert.equal(input.tools,undefined);assert.equal(input.outputProfile,'conversation');
   return {success:true,responseStatus:'completed' as const,content:'SIMULATED_LANGUAGE_PROVIDER_RESPONSE'};
  });
  assert.equal((await composeClaraResponseWithProposal('Hello',session,locale)).content,'SIMULATED_LANGUAGE_PROVIDER_RESPONSE');assert.equal(JSON.stringify(session),before);mock.mock.restore();
 }
});


test('Clara confirms a real read event naturally, in five locales, without calling the text model',async t=>{
 const data={
  success:true,calendarId:'calendar-project-1',calendarName:'Melodie Digital Calendar',
  range:{timeMin:'2026-11-08T23:00:00.000Z',timeMax:'2026-11-09T23:00:00.000Z'},
  events:[{summary:'TEST Clara OS — Agenda',start:{dateTime:'2026-11-09T10:00:00+01:00'},end:{dateTime:'2026-11-09T10:30:00+01:00'}}],
  partial:false,returnedEvents:1,
 };
 const source={source:'google-calendar',available:true,data,summary:'PROVIDER_DEBUG_SHOULD_NOT_BE_SHOWN: 1 event, UTC 09:00Z'};
 const message='Clara, retrouve dans mon calendrier Mélodie Digital le rendez-vous TEST Clara OS — Agenda du lundi 9 novembre à 10 h et confirme-moi qu’il existe réellement. Ne crée ni ne modifie aucun événement.';
 const baseline=JSON.stringify(data);
 const mock=t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>{throw Error('No model needed for already certified READ');});
 for(const locale of ['fr','en','es','de','it'] as const){
  const session=createSession();session.sources=[source];
  const result=await composeClaraResponseWithProposal(message,session,locale);
  assert.equal(result.generation.status,'completed');assert.equal(result.physicalAction,undefined);
  assert.match(result.content,/TEST Clara OS — Agenda/);
  assert.match(result.content,/Melodie Digital Calendar/);
  assert.doesNotMatch(result.content,/PROVIDER_DEBUG|UTC|09:00Z|queued|returnedEvents|Google Calendar complète|^\s*\|/);
  assert.ok(result.content.length<400,locale);
  assert.equal(result.content,naturalVerifiedCalendarReply(message,[source],locale));
 }
 assert.equal(JSON.stringify(data),baseline);
 assert.equal(mock.mock.callCount(),0);
 mock.mock.restore();
});
test('technical provenance on request; incomplete or ambiguous provider data never trigger confident canned reply',()=>{
 const message='Retrouve TEST Clara OS — Agenda dans mon calendrier';
 const data={
  success:true,calendarId:'id',calendarName:'Melodie Digital Calendar',partial:false,
  range:{timeMin:'2026-11-08T23:00:00Z',timeMax:'2026-11-09T23:00:00Z'},
  events:[{summary:'TEST Clara OS — Agenda',start:{dateTime:'2026-11-09T09:00:00Z'},end:{dateTime:'2026-11-09T09:30:00Z'}}],
 };
 const source={source:'google-calendar',available:true,data,summary:'source'};
 assert.ok(naturalVerifiedCalendarReply(message,[source],'fr'));
 assert.equal(naturalVerifiedCalendarReply(message+' Donne-moi les heures UTC et la preuve technique.',[source],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply(message,[{...source,available:false}],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply(message,[{...source,data:{...data,partial:true}}],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply(message,[{...source,data:{...data,events:[...data.events,...data.events]}}],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply('Vérifie un autre rendez-vous',[source],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply('Crée un nouveau rendez-vous',[source],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply(message,[{...source,data:{...data,events:[]}}],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply('Retrouve TEST Clara OS — Agenda à 11 h dans mon calendrier',[source],'fr'),null);
 assert.equal(naturalVerifiedCalendarReply(message,[{...source,data:{...data,events:[{...data.events[0],start:{dateTime:'2026-11-09T10:00:00'}}]}}],'fr'),null);
});
