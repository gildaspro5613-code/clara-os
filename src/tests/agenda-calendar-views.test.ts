import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {NextIntlClientProvider} from 'next-intl';
import {readFileSync} from 'node:fs';
import Administration from '../modules/agenda/GoogleAgendaAdministration';
import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarRange,navigateCalendar,eventInterval,eventsOnDay,timeSegments,isCalendarBanner} from '../modules/agenda/calendar-view';
const time=(id:string,start:string,end:string)=>({id,start:{dateTime:start},end:{dateTime:end}});
test('day/week/month reads use Paris civil boundaries and Monday weeks',()=>{
 const day=calendarRange('2026-11-06','day');assert.equal(day.days.length,1);assert.equal(new URL(day.url,'https://local.invalid').searchParams.get('timeMin'),'2026-11-05T23:00:00.000Z');
 const week=calendarRange('2026-11-06','week');assert.equal(week.start,'2026-11-02');assert.equal(week.end,'2026-11-09');assert.equal(week.days.length,7);
 const month=calendarRange('2026-11-06','month');assert.equal(month.start,'2026-10-26');assert.equal(month.end,'2026-12-07');assert.equal(month.days.length,42);
 assert.equal(calendarRange('2027-02-03','month').days.length,28);
});
test('navigation crosses months, years and leap days without elapsed-hour arithmetic',()=>{
 assert.equal(navigateCalendar('2026-12-31','day',1),'2027-01-01');assert.equal(navigateCalendar('2026-11-06','week',-1),'2026-10-30');
 assert.equal(navigateCalendar('2026-01-31','month',1),'2026-02-01');assert.equal(navigateCalendar('2028-03-01','day',-1),'2028-02-29');
});
test('DST days have the correct 23/25-hour query windows',()=>{
 for(const [day,hours]of [['2026-03-29',23],['2026-10-25',25]] as const){const url=new URL(calendarRange(day,'day').url,'https://local.invalid');assert.equal((Date.parse(url.searchParams.get('timeMax')!)-Date.parse(url.searchParams.get('timeMin')!))/3600000,hours);}
});
test('all-day end is exclusive; overnight and multi-day events belong to every intersecting day',()=>{
 const all={id:'all',start:{date:'2026-11-02'},end:{date:'2026-11-05'}};
 const overnight=time('night','2026-11-02T22:00:00Z','2026-11-03T01:00:00Z');
 assert.deepEqual(eventsOnDay([all,overnight],'2026-11-03').map(e=>e.id),['all','night']);assert.equal(eventsOnDay([all],'2026-11-05').length,0);
 assert.equal(timeSegments([overnight],'2026-11-02')[0].top,1380);assert.equal(timeSegments([overnight],'2026-11-03')[0].top,0);
 assert.equal(timeSegments([overnight],'2026-11-03')[0].bottom,120);
 assert.equal(eventsOnDay([time('midnight','2026-11-02T10:00:00Z','2026-11-02T23:00:00Z')],'2026-11-03').length,0);
});
test('overlapping appointments receive separate lanes; disjoint appointments regain width',()=>{
 const events=[time('a','2026-11-03T09:00:00Z','2026-11-03T10:00:00Z'),time('b','2026-11-03T09:30:00Z','2026-11-03T10:30:00Z'),time('c','2026-11-03T11:00:00Z','2026-11-03T12:00:00Z')];
 const segments=timeSegments(events,'2026-11-03');assert.equal(segments[0].lanes,2);assert.equal(segments[1].lanes,2);assert.notEqual(segments[0].lane,segments[1].lane);assert.equal(segments[2].lanes,1);
});
test('repeated DST hour retains both real events; invalid intervals are not invented',()=>{
 const events=[time('summer','2026-10-25T00:30:00Z','2026-10-25T00:50:00Z'),time('winter','2026-10-25T01:30:00Z','2026-10-25T01:50:00Z')];
 assert.equal(eventsOnDay(events,'2026-10-25').length,2);assert.equal(timeSegments(events,'2026-10-25')[0].lanes,2);
 assert.equal(eventInterval({start:{dateTime:'invalid'},end:{dateTime:'invalid'}}),null);assert.equal(eventInterval({start:{date:'invalid'},end:{date:'invalid'}}),null);
});

test('multi-day banners preserve original event instants and keep hourly appointments legible',()=>{
 const event=time('long','2026-11-02T21:00:00Z','2026-11-04T01:00:00Z');
 assert.equal(isCalendarBanner(event),true);assert.equal(timeSegments([event],'2026-11-03').length,0);
 assert.deepEqual(eventsOnDay([event],'2026-11-03'),[event]);assert.equal(event.start.dateTime,'2026-11-02T21:00:00Z');
});

test('Google administration remains lazy and collapsed on Connections, never duplicated in Agenda',()=>{
 for(const locale of ['fr','en','es','de','it']){
  const messages=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8'));
  let unrelatedLoads=0;const UnrelatedHub=()=>{unrelatedLoads++;return createElement('p',null,'Unrelated services');};
  const html=renderToString(createElement(NextIntlClientProvider,{locale,messages},createElement(Administration,null,createElement(UnrelatedHub))));assert.equal(unrelatedLoads,0);
  assert.ok(html.includes('id="google-agenda-administration"'));assert.ok(!/<details[^>]* open/.test(html));assert.ok(!html.includes('id="native-google-document-authority"'));assert.ok(!html.includes('MISSING_MESSAGE'));
 }
});
