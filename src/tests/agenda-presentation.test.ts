import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {NextIntlClientProvider} from 'next-intl';
import {readFileSync} from 'node:fs';
import {businessDayKey,businessDayWindow,formatBusinessDate,todayCalendarUrl,agendaCalendarUrl} from '@/modules/agenda/calendar-window';
import {calendarReadErrorKey,agendaPageReadErrorKey} from '@/modules/agenda/calendar-read-state';
import AgendaWidget from '@/components/cockpit/widgets/agenda/AgendaWidget';
import AgendaStage from '@/modules/agenda/AgendaStage';

test('business date is Paris day independently of the host and browser timezone',()=>{
 assert.equal(businessDayKey(new Date('2026-11-03T22:59:59Z')),'2026-11-03');
 assert.equal(businessDayKey(new Date('2026-11-03T23:00:00Z')),'2026-11-04');
 assert.equal(businessDayKey(new Date('2026-06-30T22:00:00Z')),'2026-07-01');
 assert.equal(businessDayKey(new Date('2026-12-31T23:00:00Z')),'2027-01-01');
});
test('full dates use the five existing locales, including weekday and year',()=>{
 const weekdays={fr:'Mardi',en:'Tuesday',es:'Martes',de:'Dienstag',it:'Martedì'};
 for(const [locale,weekday]of Object.entries(weekdays)){const text=formatBusinessDate('2026-11-03',locale);assert.ok(text.startsWith(weekday),text);assert.ok(text.includes('2026'));}
 assert.equal(formatBusinessDate('2026-11-03','fr'),'Mardi 3 novembre 2026');
});
test('Calendar windows use actual Paris midnight, including 23/25-hour DST days',()=>{
 for(const [now,start,end,hours]of [
  ['2026-11-03T23:00:01Z','2026-11-03T23:00:00.000Z','2026-11-04T23:00:00.000Z',24],
  ['2026-03-29T12:00:00Z','2026-03-28T23:00:00.000Z','2026-03-29T22:00:00.000Z',23],
  ['2026-10-25T12:00:00Z','2026-10-24T22:00:00.000Z','2026-10-25T23:00:00.000Z',25],
 ] as const){const w=businessDayWindow(new Date(now)),url=new URL(todayCalendarUrl(new Date(now)),'https://fixture.invalid');assert.equal(w.start.toISOString(),start);assert.equal(w.end.toISOString(),end);assert.equal((w.end.getTime()-w.start.getTime())/3600000,hours);assert.equal(url.searchParams.get('timeMin'),start);assert.equal(url.searchParams.get('timeMax'),end);}
});
test('presentation preserves missing selection, reconnect, denied, expired and unavailable states',()=>{
 for(const [http,code,key]of [[503,'NATIVE_GOOGLE_CONNECTION_REQUIRED','agendaConnectionRequired'],[503,'NATIVE_GOOGLE_CALENDAR_REQUIRED','agendaCalendarRequired'],[403,'NATIVE_GOOGLE_REAUTH_REQUIRED','agendaReconnectRequired'],[403,'REGISTRY_ACCESS_DENIED','agendaAccessDenied'],[401,'AUTHENTICATED_OS_SESSION_REQUIRED','agendaSessionExpired'],[503,'PRIVATE_SQL_ERROR','agendaTemporarilyUnavailable']] as const)assert.equal(calendarReadErrorKey(http,code),key);
});
const render=(component:typeof AgendaWidget|typeof AgendaStage,locale:string)=>{const messages=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8'));messages.ui=JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'));return renderToString(createElement(NextIntlClientProvider,{locale,timeZone:'Europe/Paris',messages},createElement(component)));};
test('SSR has a deterministic date placeholder and closed settings; no provider data or writes on render',()=>{
 const previous=process.env.TZ;
 try{for(const component of [AgendaWidget,AgendaStage])for(const locale of ['fr','en','es','de','it']){
  process.env.TZ='UTC';const utc=render(component,locale);process.env.TZ='America/Los_Angeles';assert.equal(render(component,locale),utc);
  if(component===AgendaWidget)assert.match(utc,/data-business-date="true">—<\/time>/);assert.ok(!utc.includes('MISSING_MESSAGE'));
  if(component===AgendaStage){assert.ok(!utc.includes('<details'));assert.ok(!utc.includes('id="native-google-document-authority"'));assert.ok(utc.includes('data-agenda-view="week"'));assert.ok(utc.includes('/connexions#google-agenda-administration'));}
 }}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('Agenda periods reuse bounded Paris windows across DST and weeks',()=>{
 const params=(period:'today'|'week'|'upcoming',date:string)=>new URL(agendaCalendarUrl(period,new Date(date)),'https://local.invalid').searchParams;
 assert.equal(params('today','2026-11-06T12:00:00Z').get('timeMin'),'2026-11-05T23:00:00.000Z');
 assert.equal(params('week','2026-11-06T12:00:00Z').get('timeMin'),'2026-11-01T23:00:00.000Z');
 assert.equal(params('week','2026-11-06T12:00:00Z').get('timeMax'),'2026-11-08T23:00:00.000Z');
 assert.equal(params('week','2026-03-29T12:00:00Z').get('timeMax'),'2026-03-29T22:00:00.000Z');
 assert.equal(params('upcoming','2026-10-24T12:00:00Z').get('timeMax'),'2026-11-22T23:00:00.000Z');
});
test('Agenda consent wording changes no Cockpit state and never hides a refusal',()=>{
 assert.equal(agendaPageReadErrorKey(403,'GOOGLE_CONSENT_REQUIRED'),'agendaConsentRequired');
 assert.equal(calendarReadErrorKey(403,'GOOGLE_CONSENT_REQUIRED'),'agendaAccessDenied');
 assert.equal(agendaPageReadErrorKey(403,'REGISTRY_ACCESS_DENIED'),'agendaAccessDenied');
 assert.equal(agendaPageReadErrorKey(401,'AUTHENTICATED_OS_SESSION_REQUIRED'),'agendaSessionExpired');
});
