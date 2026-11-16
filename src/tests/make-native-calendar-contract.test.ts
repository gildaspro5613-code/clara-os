import test from 'node:test';
import assert from 'node:assert/strict';
import {RegistryError} from '@/lib/canonical/registry';
import {CapabilityRegistry} from '@/lib/capabilities/capability-registry';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {MAKE_CALENDAR_READS,calendarInstant,nativeMakeCalendarReadInput,nativeMakeCalendarReadResult} from '@/lib/connectors/make/native-calendar-read-contract';
import {verifyMakeCalendarScenarioContract,verifyMakeCalendarReadConnection} from '@/lib/connectors/make/native-calendar-scenario';
import {calendarBinding,calendarCredentials,calendarInput,calendarContractFixture,calendarFixtureFetch,calendarResponse} from './helpers/make-calendar-fixture';

const [availability,search]=MAKE_CALENDAR_READS;
const invalid=(fn:()=>unknown)=>assert.throws(fn,e=>e instanceof RegistryError);

test('two distinct Calendar READs are registered; generic Make execute remains outside READ',()=>{
 const directory=new ConnectorBuilderDirectory(),registry=new CapabilityRegistry();
 for(const c of MAKE_CALENDAR_READS){assert.equal(registry.has(c.capabilityId),true);assert.equal(directory.findRead(c.capabilityId)?.effect,'READ');}
 assert.equal(directory.findRead('make.scenario.execute'),undefined);
 assert.equal(directory.findRead('make.calendar.create'),undefined);
});

test('Calendar inputs: explicit offsets, IANA time zone, bounded range and optional search only',()=>{
 for(const cap of MAKE_CALENDAR_READS)assert.deepEqual(nativeMakeCalendarReadInput(cap.capabilityId,calendarInput),calendarInput);
 for(const query of [null,'','  ',undefined]){
  const input=query===undefined?calendarInput:{...calendarInput,query};
  assert.deepEqual(nativeMakeCalendarReadInput(search.capabilityId,input),calendarInput);
 }
 assert.equal(nativeMakeCalendarReadInput(search.capabilityId,{...calendarInput,query:'  Électricité RTSE  '}).query,'Électricité RTSE');
 assert.doesNotThrow(()=>nativeMakeCalendarReadInput(search.capabilityId,{start:'2026-03-29T01:30:00+01:00',end:'2026-03-29T03:30:00+02:00',timeZone:'Europe/Paris'}));
 assert.doesNotThrow(()=>nativeMakeCalendarReadInput(search.capabilityId,{start:'2026-10-25T02:15:00+02:00',end:'2026-10-25T02:45:00+01:00',timeZone:'Europe/Paris'}));
});

test('invalid dates, DST gaps, ambiguity, unknown keys and authority smuggling fail closed',()=>{
 for(const input of [null,[],{},
  {...calendarInput,start:'2026-02-30T09:00:00+01:00'},
  {...calendarInput,start:'2026-11-17T09:00:00'},
  {...calendarInput,start:'2026-11-17'},
  {...calendarInput,start:'2026-11-17T09:00:00Z'},
  {...calendarInput,start:'2026-11-17T24:00:00+01:00'},
  {...calendarInput,end:calendarInput.start},
  {...calendarInput,end:'2026-12-20T12:00:00+01:00'},
  {...calendarInput,timeZone:'not/a-zone'},
  {...calendarInput,timeZone:null},
  {start:'2026-03-29T02:30:00+01:00',end:'2026-03-29T03:30:00+02:00',timeZone:'Europe/Paris'},
  ...['calendarId','workspaceId','connectionId','scenarioKey','missionId','token'].map(key=>({...calendarInput,[key]:'forged'})),
  {...calendarInput,query:'x'.repeat(201)}, {...calendarInput,query:'x\ny'}, {...calendarInput,query:12},
  JSON.parse(JSON.stringify(calendarInput).slice(0,-1)+',"__proto__":{}}'),Object.create(calendarInput),
 ])invalid(()=>nativeMakeCalendarReadInput(search.capabilityId,input));
 invalid(()=>nativeMakeCalendarReadInput(availability.capabilityId,{...calendarInput,query:'not supported'}));
 for(const s of ['2026-01-01T12:00:00+14:30','2026-01-01T12:00:00-00:00','2026-01-01T12:00:60Z'])assert.equal(calendarInstant(s),null);
});

test('output contracts: bounded busy ranges, one partial event, all-day and safe Calendar links',()=>{
 const busy=nativeMakeCalendarReadResult(availability.capabilityId,calendarResponse(availability),calendarInput);
 assert.equal('availability' in busy&&busy.availability,'busy');
 const free=nativeMakeCalendarReadResult(availability.capabilityId,{...calendarResponse(availability),busyRanges:[]},calendarInput);
 assert.equal('availability' in free&&free.availability,'unconfirmed','missing per-calendar errors must never mean free');
 const found=nativeMakeCalendarReadResult(search.capabilityId,calendarResponse(search),calendarInput);
 assert.equal('partial' in found&&found.partial,true);
 assert.doesNotThrow(()=>nativeMakeCalendarReadResult(search.capabilityId,{...calendarResponse(search),start:'2026-11-17',end:'2026-11-18',location:null,htmlLink:null},calendarInput));
});

test('empty, failed, wrong-period, oversized and malicious supplier outputs never certify a result',()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const good=calendarResponse(cap);
  for(const result of [null,{},[],{...good,status:'failed'},{...good,provider:'other'},{...good,errors:[{reason:'notFound'}]},
   cap===search?{...good,eventId:null}:{...good,busyRanges:null},
   cap===search?{...good,htmlLink:'javascript:alert(1)'}:{...good,busyRanges:[{start:calendarInput.start,end:calendarInput.end,errors:[]}]},
   cap===search?{...good,htmlLink:'https://evil.test/calendar/event'}:{...good,busyRanges:Array(101).fill({start:calendarInput.start,end:calendarInput.end})},
   cap===search?{...good,start:'2027-11-17T09:00:00+01:00',end:'2027-11-17T12:00:00+01:00'}:{...good,start:'2027-11-17T09:00:00+01:00'},
  ])invalid(()=>nativeMakeCalendarReadResult(cap.capabilityId,result,calendarInput));
 }
 invalid(()=>nativeMakeCalendarReadResult(search.capabilityId,{...calendarResponse(search),start:'2026-12-01',end:'2026-12-02'},calendarInput));
});

test('audited Calendar contracts verify exact input/output, calendar, connection and READ-only module maps',async()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const f=calendarContractFixture(cap),verify=()=>verifyMakeCalendarScenarioContract(cap,calendarBinding,f.details,f.iface,f.blueprint);
  assert.equal(verify(),true);
  const {fetcher,urls}=calendarFixtureFetch(cap);
  await verifyMakeCalendarReadConnection(cap,calendarBinding,calendarCredentials.api!,fetcher);
  assert.equal(urls.length,3);assert.ok(urls[2].endsWith('/blueprint?draft=false'));assert.ok(urls.every(u=>!u.endsWith('/run')));
  const flow=f.blueprint.blueprint.flow as Array<Record<string,unknown>>;
  const saved=structuredClone(flow[1]);
  for(const mutation of [{module:'google-calendar:createEvent'},{parameters:{__IMTCONN__:99}},{mapper:{calendar:'other'}},{onerror:[]},{routes:[]},{filter:{name:'drop errors'}},{version:99}]){
   Object.assign(flow[1],mutation);assert.equal(verify(),false);flow[1]=structuredClone(saved);
  }
  flow.push({module:'http:ActionSendData'});assert.equal(verify(),false);flow.pop();
  const name=f.iface.interface.input[0].name;f.iface.interface.input[0].name='calendarId';assert.equal(verify(),false);f.iface.interface.input[0].name=name;
  f.iface.interface.output[0].type='any';assert.equal(verify(),false);
 }
});

test('verification handles inaccessible calendars/accounts, timeouts and invalid upstream JSON with fixed codes',async()=>{
 for(const response of [new Response('private',{status:401}),new Response('private',{status:403}),new Response('private',{status:404}),new Response('private',{status:429}),new Response('private',{status:503})]){
  await assert.rejects(verifyMakeCalendarReadConnection(search,calendarBinding,calendarCredentials.api!,async()=>response),e=>e instanceof RegistryError&&e.code==='CONNECTOR_BUILDER_MAKE_CALENDAR_PROVIDER_UNAVAILABLE'&&!e.message.includes('private'));
 }
 await assert.rejects(verifyMakeCalendarReadConnection(search,calendarBinding,calendarCredentials.api!,async()=>new Response('not-json')),e=>e instanceof RegistryError&&e.code==='CONNECTOR_BUILDER_MAKE_CALENDAR_SCENARIO_CHANGED');
 await assert.rejects(verifyMakeCalendarReadConnection(search,calendarBinding,calendarCredentials.api!,async()=>{throw Error('private timeout');}),e=>e instanceof RegistryError&&e.code==='CONNECTOR_BUILDER_MAKE_CALENDAR_PROVIDER_UNAVAILABLE');
 let gets=0;
 await assert.rejects(verifyMakeCalendarReadConnection(search,calendarBinding,{...calendarCredentials.api!,zone:'evil.test'},async()=>{gets++;throw Error();}));assert.equal(gets,0);
});
