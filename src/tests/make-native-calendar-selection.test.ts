import test from 'node:test';
import assert from 'node:assert/strict';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {createSession} from '@/lib/core/session';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {buildBrainSources} from '@/lib/brain/brain-source-registry';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {executeNativeBuilderToolCall} from '@/lib/connectors/core/native-connector-builder-tool';
import {eligibleConnectorReadNames,nativeBuilderReadSelectionInstructions,selectAndExecuteNativeBuilderRead} from '@/lib/connectors/core/native-connector-builder-selection';
import {MAKE_CALENDAR_READS,claimMakeCalendarRead,makeCalendarReadState,makeCalendarReadRequested} from '@/lib/connectors/make/native-calendar-read-contract';
import {executeMakeCalendarRead,authorizeNativeMakeCalendar} from '@/lib/connectors/make/native-calendar-read';
import {MakeCalendarReadCapabilityDefinitions} from '@/lib/capabilities/make-scenario/capability';
import {calendarBinding,calendarCredentials,calendarInput,calendarFixtureFetch,calendarResponse} from './helpers/make-calendar-fixture';
import type {Event} from '@/types';

const allowed=MAKE_CALENDAR_READS.map(c=>({provider:'make',capabilityId:c.capabilityId,connectionId:'make-fixture',revision:1,catalogRevision:1}));
const drive={provider:'make',capabilityId:'make.drive.find',connectionId:'make-drive-fixture',revision:1,catalogRevision:1};
const message='Vérifie la disponibilité du calendrier via Make le 17 novembre 2026 de 9h à 12h Europe/Paris';

test('Calendar selection is explicit Make opt-in; ordinary Calendar uses native; Drive eligibility is preserved',()=>{
 const all=[...allowed,drive];
 assert.deepEqual(eligibleConnectorReadNames('Cherche RTSE Angers avec Make',[...all]),['make.drive.find']);
 assert.deepEqual(eligibleConnectorReadNames('Cherche mes rendez-vous dans Google Calendar',all),[]);
 assert.deepEqual(eligibleConnectorReadNames('Vérifie mon calendrier',all),[]);
 assert.deepEqual(eligibleConnectorReadNames(message,all),allowed.map(c=>c.capabilityId).sort());
 assert.equal(makeCalendarReadRequested('Supprime le rendez-vous via Make'),false);
 assert.equal(makeCalendarReadRequested('Vérifie le calendrier natif Google Calendar sans Make'),false);
 const instructions=nativeBuilderReadSelectionInstructions(allowed.map(c=>c.capabilityId));
 for(const cap of MakeCalendarReadCapabilityDefinitions)assert.ok(instructions.includes(JSON.stringify(cap.inputSchema)));
 assert.doesNotMatch(instructions,/make-fixture|fixture-subject|fixture-calendar/);
});

test('explicit Make Calendar READ accepts standalone non-modification instructions',()=>{
 const positives=[
  'Cherche les événements du calendrier via Make',
  message,
  message+', ne modifie rien.',
  message+' sans rien modifier.',
  'Ne modifie rien ; '+message,
  'Sans rien modifier, '+message,
  'NE MODIFIE RIEN et '+message,
  message+' ; ne modifie rien et sans rien modifier.',
 ];
 for(const text of positives){
  assert.equal(makeCalendarReadRequested(text),true,text);
  assert.deepEqual(eligibleConnectorReadNames(text,[...allowed,drive]),allowed.map(c=>c.capabilityId).sort(),text);
 }
});

test('non-modification phrases cannot hide a real WRITE, SEND, DELETE or exception',()=>{
 for(const action of [
  'modifie le rendez-vous', 'modifier le rendez-vous', 'crée un événement',
  'supprime le rendez-vous', 'envoie une invitation', 'déplace le rendez-vous',
  'réserve le créneau', 'change l’horaire', 'ajoute un événement', 'annule le rendez-vous',
  'create an event', 'delete the event', 'send an invitation', 'update the event', 'modify the event', 'remove the event',
 ]){
  for(const guard of ['', ', ne modifie rien', ', sans rien modifier']){
   const text=message+guard+' ; puis '+action;
   assert.equal(makeCalendarReadRequested(text),false,text);
   assert.ok(!eligibleConnectorReadNames(text,allowed).length,text);
  }
 }
 for(const text of [
  message+', ne modifie rien sauf l’horaire',
  message+', sans rien modifier, sauf l’horaire',
  message+', ne modifie rien mais change l’horaire',
  message+', ne modifie rien au rendez-vous sauf son horaire',
 ])assert.equal(makeCalendarReadRequested(text),false,text);
});

test('non-modification instructions do not opt native Calendar into Make or grant unavailable READs',async()=>{
 for(const text of [
  'Cherche les événements du calendrier, ne modifie rien.',
  'Cherche les événements du calendrier sans rien modifier.',
  message+' sans Make, ne modifie rien.',
  message+' sans rien modifier ; utilise Google Calendar natif.',
 ]){
  assert.equal(makeCalendarReadRequested(text),false,text);
  assert.deepEqual(eligibleConnectorReadNames(text,allowed),[],text);
 }
 let calls=0;
 const result=await selectAndExecuteNativeBuilderRead(message+', ne modifie rien.',[],{
  async select(){calls++;throw Error('No cognitive call without a grant');},
  async execute(){calls++;throw Error('No execution without a grant');},
 });
 assert.equal(result,null);assert.equal(calls,0);
 assert.deepEqual(eligibleConnectorReadNames('Cherche RTSE Angers avec Make, ne modifie rien.',[...allowed,drive]),['make.drive.find']);
});

function request(){return new Request('https://os.fixture/api?workspaceId=workspace-a&clientId=client-a&projectId=project-a&sessionId=native:fixture',{headers:{cookie:'clara_auth_session='+'A'.repeat(43)}});}
const nativeData=()=>({userId:'user-a',session:{...createSession(),googleConnectionId:calendarBinding.googleConnectionId,googleCalendarId:calendarBinding.calendarId},missions:[],journal:[]});

test('authenticated cognitive selection -> real native tool/gateway -> calendar authority -> simulated scenario',async()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const sqlCalls:string[]=[],phases:string[]=[],proof={userId:'user-a',workspaceId:'workspace-a',clientId:'client-a',projectId:'project-a',provider:'make',capabilityId:cap.capabilityId,connectionId:'make-fixture',revision:1,catalogRevision:1};
  const resource={bindingId:'binding-fixture',kind:'calendar',metadata:{id:calendarBinding.calendarId,connectionId:calendarBinding.googleConnectionId,issuer:'https://accounts.google.com',subject:calendarBinding.googleSubject}};
  const query:RegistryQuery=async(strings,...values)=>{
   assert.equal(values[1],'workspace-a');assert.equal(values[2],'client-a');assert.equal(values[3],'project-a');assert.equal(values[4],'native:fixture');
   const sql=strings.join('?');sqlCalls.push(sql);
   const operation=String(values[5]);
   if(sql.includes('clara_native_runtime_command'))return [{data:nativeData()}];
   if(sql.includes('clara_native_google_command')&&operation==='authority')return [{data:{...proof,connectionId:calendarBinding.googleConnectionId,ownerUserId:'user-a',issuer:'https://accounts.google.com',subject:calendarBinding.googleSubject,connection:{workspace_id:'workspace-a',status:'ACTIVE'}}}];
   if(sql.includes('clara_native_google_work_command'))return [{data:operation==='resources'?{resources:[resource]}:resource}];
   throw Error('Unexpected SQL');
  };
  await withNativeScope(request(),false,async()=>{
   let selections=0,runs=0;
   const outcome=await selectAndExecuteNativeBuilderRead(message,allowed,{
    async select(){selections++;return {success:true,responseStatus:'completed',toolCalls:[{callId:'calendar-read',name:'clara_connector_read',arguments:JSON.stringify({capabilityId:cap.capabilityId,inputJson:JSON.stringify(calendarInput)})}]};},
    async execute(call){return executeNativeBuilderToolCall(call,{
     directory:new ConnectorBuilderDirectory(),authority:{async authorize(){return proof;}},audit:{async record(e){phases.push(e.phase);}},
     executor:{async execute(req){
      const {fetcher}=calendarFixtureFetch(cap);
      const result=await executeMakeCalendarRead(req.capabilityId,req.workspaceId,JSON.parse(call.arguments),calendarCredentials,{authorize:authorizeNativeMakeCalendar,fetcher,async invoke(invocation){runs++;assert.equal(invocation.scenarioKey,cap.scenarioKey);return {ok:true,status:200,executionStatus:'completed',scenarioKey:cap.scenarioKey,data:calendarResponse(cap)};}});
      return {provider:'make',capabilityId:cap.capabilityId,connectionId:'make-fixture',status:'completed',data:result.data};
     }},
    });},
   });
   assert.equal(outcome?.available,true);assert.equal(selections,1);assert.equal(runs,1);assert.deepEqual(phases,['REQUESTED','SUCCEEDED']);
   assert.ok(sqlCalls.some(sql=>sql.includes('clara_native_google_work_command')));
   makeCalendarReadState(nativeContext()!).expectedCalendarName='Other Calendar';
   await assert.rejects(authorizeNativeMakeCalendar(calendarBinding),/CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED/);
  },query);
 }
});

test('no grant on explicit Make Calendar route: clear refusal, zero Google fallback queries',async()=>{
 // Avoid even an attempted Builder database connection in this fixture process.
 const prior=process.env.CLARA_BUILDER_DATABASE_URL;delete process.env.CLARA_BUILDER_DATABASE_URL;
 try{
  let googleCalls=0;
  const query:RegistryQuery=async(strings)=>{
   if(strings.join('').includes('clara_native_google_command')){googleCalls++;return [{data:{connections:[]}}];}
   return [{data:nativeData()}];
  };
  for(const text of [message,message+', ne modifie rien.',message+' sans rien modifier.']){
   await withNativeScope(request(),false,async()=>{
    const sources=await buildBrainSources({type:'USER_MESSAGE',payload:{message:text}} as Event,new Date('2026-11-16T10:00:00Z'));
    assert.equal(makeCalendarReadState(nativeContext()!).provider,'make');
    assert.equal(googleCalls,0);
    const read=sources.find(s=>s.source==='connector-builder-read');
    assert.equal(read?.available,false);assert.match(read?.summary??'',/pas autorisée|configurée/);
   },query);
  }
  await withNativeScope(request(),false,async()=>{
   await buildBrainSources({type:'USER_MESSAGE',payload:{message:'Montre mon calendrier le 17 novembre 2026'}} as Event,new Date('2026-11-16T10:00:00Z'));
   assert.equal(makeCalendarReadState(nativeContext()!).provider,'native');assert.equal(googleCalls,1);
  },query);
 }finally{if(prior!==undefined)process.env.CLARA_BUILDER_DATABASE_URL=prior;}
});

test('ordinary Calendar intent costs no Make cognitive selection or execution',async()=>{
 let calls=0;
 assert.equal(await selectAndExecuteNativeBuilderRead('Montre mon calendrier le 17 novembre 2026',allowed,{async select(){calls++;throw Error();},async execute(){calls++;throw Error();}}),null);
 assert.equal(calls,0);
});


test('request-only Calendar claim prevents native/Make duplication and retries, isolated between contexts',()=>{
 const first={},second={},native={};
 claimMakeCalendarRead(first);
 assert.throws(()=>claimMakeCalendarRead(first),/CONNECTOR_BUILDER_MAKE_CALENDAR_DUPLICATE_DENIED/);
 assert.doesNotThrow(()=>claimMakeCalendarRead(second));
 makeCalendarReadState(native).provider='native';
 assert.throws(()=>claimMakeCalendarRead(native),/CONNECTOR_BUILDER_MAKE_CALENDAR_DUPLICATE_DENIED/);
});
