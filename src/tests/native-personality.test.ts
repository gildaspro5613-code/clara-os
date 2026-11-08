import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantPersonalityInstructions,ASSISTANT_PERSONALITY} from '../lib/knowledge/assistant/personality';
import {composeClaraResponseWithProposal} from '../lib/brain/response-composer';
import {OpenAIResponsesEngine} from '../lib/connectors/internal/openai/responses/openai-responses-engine';
import {createSession} from '../lib/core/session';
import {responseLanguageInstruction} from '../i18n/response-language';

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
   assert.match(input.instructions??'',/j’approuve/);
   assert.match(input.prompt,/ÉTAT RÉEL DES OPÉRATIONS/);
   assert.match(input.prompt,/Une proposition textuelle de rendez-vous n'est pas un travail Google Calendar préparé/);
   assert.match(input.prompt,/Ne présente une action comme préparée, en attente d'approbation ou terminée/);
   assert.ok(input.prompt.includes(responseLanguageInstruction(locale)));assert.ok(input.prompt.includes('Prénom : non identifié'));
   assert.ok(!input.prompt.includes('UNVERIFIED_SESSION_DEFAULT'));assert.equal(input.tools,undefined);assert.equal(input.outputProfile,'conversation');
   return {success:true,responseStatus:'completed' as const,content:'SIMULATED_LANGUAGE_PROVIDER_RESPONSE'};
  });
  assert.equal((await composeClaraResponseWithProposal('Hello',session,locale)).content,'SIMULATED_LANGUAGE_PROVIDER_RESPONSE');assert.equal(JSON.stringify(session),before);mock.mock.restore();
 }
});
