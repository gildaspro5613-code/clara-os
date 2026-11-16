import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {automationCards,automationCopy} from '@/lib/automations/automation-cards';

test('Automations cards link only to existing workspaces and never to a direct execution endpoint',()=>{
 assert.deepEqual(automationCards.map(x=>x.key),['calendar','documents','email','brevo','make']);
 assert.equal(new Set(automationCards.map(x=>x.key)).size,5);
 assert.equal(automationCards.find(x=>x.key==='email')?.href,'/messagerie');
 assert.equal(automationCards.find(x=>x.key==='make')?.href,'/connexions');
 assert.equal(automationCards.find(x=>x.key==='brevo')?.href,'/connexions');
 for(const card of automationCards){
  assert.match(card.href,/^\/(?:agenda|documents|messagerie|connexions)$/);
  assert.ok(card.status==='scoped'||card.status==='review'||card.status==='uncertified');
 }
});

test('all five languages have honest descriptions, statuses, navigation labels and a shared non-execution disclaimer',()=>{
 for(const locale of ['fr','en','es','de','it']){
  const text=automationCopy(locale);
  assert.ok(text.intro.length>20&&text.disclaimer.length>25&&text.heading.length>4);
  for(const label of Object.values(text.statuses))assert.ok(label.trim().length>2);
  for(const c of automationCards){
   const card=text.cards[c.key];
   assert.ok(card.title.trim().length>2&&card.description.length>30&&card.action.length>5,locale+':'+c.key);
  }
 }
 assert.equal(automationCopy('unknown').cards.make.title,'Make');
});

test('responsive glass cards are never narrow four-column cards or active Make execution controls',()=>{
 const source=readFileSync('src/app/automatisations/page.tsx','utf8');
 assert.match(source,/sm:grid-cols-2 xl:grid-cols-3/);
 assert.match(source,/min-w-0 flex-col/);
 assert.match(source,/data-automation-card/);
 assert.match(source,/automationCards\.map/);
 assert.doesNotMatch(source,/xl:grid-cols-4|MakeConnectionStatus|\/clara\?intent=(?:email|brevo)|\/api\/connections\/make\/configure/);
 assert.match(source,/href=\{card\.href\}/);
});
