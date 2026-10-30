import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NextIntlClientProvider} from 'next-intl';
import {readFileSync} from 'node:fs';
import Voice from '../components/clara/ClaraVoiceWidget';
import Tasks from '../components/cockpit/panels/TasksPanel';
import Actions from '../components/cockpit/widgets/CockpitActionBar';
import type {Mission} from '../modules/missions/types/Mission';
const render=(child:ReturnType<typeof createElement>,locale='fr')=>{
 const messages=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8'));
 messages.ui={...messages.ui,...JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'))};
 return renderToStaticMarkup(createElement(NextIntlClientProvider,{locale,timeZone:'Europe/Paris',messages},child));
};
test('historical Tasks uses the authorized mission rather than the old 82 percent fixture',()=>{
 const mission={title:'AUTHORIZED_MISSION',objective:'AUTHORIZED_OBJECTIVE',progress:17,nextAction:'AUTHORIZED_NEXT',tasks:[]} as unknown as Mission;
 const html=render(createElement(Tasks,{mission}));
 for(const text of ['AUTHORIZED_MISSION','AUTHORIZED_OBJECTIVE','AUTHORIZED_NEXT','17 %','width:17%','href="/missions"'])assert(html.includes(text),text);
 assert(!html.includes('82 %'));assert(!html.includes('Finaliser le cockpit'));
});
test('native historical microphone stays disabled and honest in all five languages',()=>{
 for(const locale of ['fr','en','es','de','it']){
  const html=render(createElement(Voice,{disabled:true}),locale);
  assert.match(html,/<button[^>]*disabled=""/);assert(!html.includes('data-connected'));
  const ui=JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'));
  // SSR escapes quotes; the visible refusal is verified by the browser too.
  assert(html.includes(ui.nativeProviderBlocked.replaceAll("'",'&#x27;')));
 }
});
test('the historical action bar navigates existing pages instead of decorative buttons',()=>{
 const html=render(createElement(Actions));assert.equal((html.match(/<a /g)??[]).length,6);assert(!html.includes('<button'));
 for(const href of ['/clara?intent=new-mission','/agenda','/missions','/conversations','/automatisations','/documents'])assert(html.includes('href="'+href+'"'));
});
