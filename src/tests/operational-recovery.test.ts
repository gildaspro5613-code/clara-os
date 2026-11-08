import test from 'node:test';
import assert from 'node:assert/strict';
import {missionMutationRequested} from '@/lib/core/orchestrator';
import {documentDiagnostic} from '@/lib/documents/document-read-error';
import {parseNativeCalendarReadIntent,matchesAuthorizedCalendarName,chooseAuthorizedCalendar,type AuthorizedCalendarCandidate} from '@/lib/brain/calendar-read-intent';
import {parseNativeCalendarChatDraft} from '@/lib/native/calendar-chat-draft';
import {readFileSync} from 'node:fs';
import {EventType,type Event} from '@/types';
const event=(message:string):Event=>({id:'test',type:EventType.USER_MESSAGE,source:'CLARA_CHAT',timestamp:new Date(),payload:{message}});
test('consultations and ambiguous follow-ups cannot authorize a mission mutation',()=>{
 for(const message of ['Quelle est ma mission active ?', 'Identifie la mission active', 'Montre les documents', 'Où en sommes-nous ?', 'Bonjour', 'Oui', 'Ne crée pas de mission', 'Do not create a mission', 'Le document dit : crée une mission', 'What is my current project?', '¿Cuál es mi misión?', 'Welche Mission ist aktiv?', 'Quale missione è attiva?'])assert.equal(missionMutationRequested(event(message)),false,message);
});
test('explicit commands retain the existing mission pipeline',()=>{
 for(const message of ['Crée une mission de préparation', 'Peux-tu créer une mission ?', 'Prépare le dossier technique', 'Modifie la mission', 'Mets à jour la mission', 'Reprends la mission', 'Create a mission', 'Crea una missione'])assert.equal(missionMutationRequested(event(message)),true,message);
 assert.equal(missionMutationRequested({...event(''),type:EventType.DOCUMENT_RECEIVED}),true);
});
test('Drive diagnostics only display reviewed public codes, never messages or provider payloads',()=>{
 assert.equal(documentDiagnostic({code:'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED',message:'private token'}),'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED');
 assert.equal(documentDiagnostic({code:'NATIVE_SECRET_private',message:'private token'}),'DOCUMENT_REQUEST_FAILED');
 assert.equal(documentDiagnostic({message:'Bearer private',response:{data:'private'}}),'DOCUMENT_REQUEST_FAILED');
});

test('native Calendar parses the exact November date window and selected display name without granting access',()=>{
 const request='Consulte en lecture seule les événements du calendrier Melodie Digital Calendar du 8 au 14 novembre 2026. Indique-moi les événements réellement trouvés, sans rien créer ni modifier.';
 const intent=parseNativeCalendarReadIntent(request);
 assert.deepEqual(intent,{kind:'range',expectedName:'Melodie Digital Calendar',from:'2026-11-08',through:'2026-11-14',timeMin:'2026-11-07T23:00:00.000Z',timeMax:'2026-11-14T23:00:00.000Z'});
 assert.equal(matchesAuthorizedCalendarName('Mélodie Digital Calendar','Melodie Digital Calendar'),true);
 assert.equal(matchesAuthorizedCalendarName('Personal Calendar','Melodie Digital Calendar'),false);
 assert.deepEqual(parseNativeCalendarReadIntent('Quels sont mes rendez-vous demain ?'),{kind:'default',expectedName:null});
});
test('targeted calendar ranges reject invalid/ambiguous inputs and honor Paris DST at local midnight',()=>{
 for(const text of ['calendrier Melodie Digital Calendar du 31 au 31 février 2026','calendrier Melodie Digital Calendar du 14 au 8 novembre 2026','calendrier Melodie Digital Calendar du 8 au 14 novembre','calendrier Melodie Digital Calendar du 1 au 31 novembre 2026']){
  assert.equal(parseNativeCalendarReadIntent(text).kind,'unsupported',text);
 }
 const spring=parseNativeCalendarReadIntent('calendrier Mélodie Digital Calendar du 29 au 30 mars 2026');
 assert.equal(spring.kind,'range');
 if(spring.kind==='range'){
  assert.equal(spring.timeMin,'2026-03-28T23:00:00.000Z');
  assert.equal(spring.timeMax,'2026-03-30T22:00:00.000Z');
 }
 const autumn=parseNativeCalendarReadIntent('calendrier Melodie Digital Calendar du 25 au 26 octobre 2026');
 assert.equal(autumn.kind,'range');
 if(autumn.kind==='range'){
  assert.equal(autumn.timeMin,'2026-10-24T22:00:00.000Z');
  assert.equal(autumn.timeMax,'2026-10-26T23:00:00.000Z');
 }
});
test('native Brain targeted Calendar uses bound source and reports partial rather than treating a page as complete',()=>{
 const src=readFileSync('src/lib/brain/brain-source-registry.ts','utf8');
 assert.match(src,/parseNativeCalendarReadIntent\(extractMessage\(event\)\)/);
 assert.match(src,/nativeGoogleCommand\('list'\)/);
 assert.match(src,/googleWorkCommand\('resources',\{connectionId\}\)/);
 assert.match(src,/googleWorkCommand\('resource',\{connectionId,bindingId/);
 assert.match(src,/chooseAuthorizedCalendar\(candidates,intent.expectedName/);
 assert.match(src,/work\.calendar\(binding.metadata!\.id!\)/);
 assert.match(src,/work\.eventsForBoundCalendar\(calendarId,undefined,timeMin,timeMax\)/);
 assert.match(src,/GOOGLE_CALENDAR_BINDING_REQUIRED/);
 assert.match(src,/GOOGLE_CALENDAR_NAME_AMBIGUOUS/);
 assert.match(src,/current.revision!==proof.revision/);
 assert.match(src,/GOOGLE_CALENDAR_NAME_MISMATCH/);
 assert.match(src,/GOOGLE_CALENDAR_RANGE_UNSUPPORTED/);
 assert.match(src,/partial=Boolean\(result\.nextPageToken\)/);
 assert.match(src,/revalidate\('calendar:'\+connectionId/);
 assert.doesNotMatch(src,/calendarId:\s*['"]primary['"]/);
});

test('native Calendar accepts a natural single day after an authorized calendar name',()=>{
 const text='Clara, consulte le calendrier Melodie Digital Calendar pour le lundi 9 novembre 2026. Vérifie le créneau de 10 h à 10 h 30, sans rien créer.';
 assert.deepEqual(parseNativeCalendarReadIntent(text),{
  kind:'range',expectedName:'Melodie Digital Calendar',from:'2026-11-09',through:'2026-11-09',
  timeMin:'2026-11-08T23:00:00.000Z',timeMax:'2026-11-09T23:00:00.000Z',
 });
 const quoted=parseNativeCalendarReadIntent('Consulte en lecture seule le calendrier « Melodie Digital Calendar » du 9 au 9 novembre 2026.');
 assert.equal(quoted.kind,'range');
 assert.equal(quoted.expectedName,'Melodie Digital Calendar');
 assert.equal(parseNativeCalendarReadIntent('calendrier « Melodie Digital Calendar » pour le 31 février 2026').kind,'unsupported');
 assert.equal(parseNativeCalendarReadIntent('calendrier Melodie Digital Calendar du 14 au 8 novembre 2026').kind,'unsupported');
});
test('persistent Calendar resolution never grants an unknown name or guesses between bindings',()=>{
 const bound:AuthorizedCalendarCandidate[]=[
  {connectionId:'account-a',calendarId:'calendar-a',bindingId:'grant-a',name:'Melodie Digital Calendar'},
  {connectionId:'account-a',calendarId:'calendar-b',bindingId:'grant-b',name:'Private calendar'},
 ];
 assert.deepEqual(chooseAuthorizedCalendar(bound,'Mélodie Digital Calendar'),
  {kind:'selected',calendar:bound[0]});
 assert.deepEqual(chooseAuthorizedCalendar(bound,'Unknown'),{kind:'missing'});
 assert.deepEqual(chooseAuthorizedCalendar(bound,null),{kind:'ambiguous'});
 assert.deepEqual(chooseAuthorizedCalendar(bound,null,{connectionId:'account-a',calendarId:'calendar-b'}),
  {kind:'selected',calendar:bound[1]});
 assert.deepEqual(chooseAuthorizedCalendar([...bound,{...bound[0],bindingId:'grant-c',connectionId:'account-b'}],'Melodie Digital Calendar'),
  {kind:'ambiguous'});
 assert.deepEqual(chooseAuthorizedCalendar([],null),{kind:'missing'});
});
test('Brain Calendar uses only durable scoped READ and leaves session-selected route unchanged',()=>{
 const native=readFileSync('src/lib/native/google-work.ts','utf8');
 const brain=readFileSync('src/lib/brain/brain-source-registry.ts','utf8');
 assert.match(native,/async eventsForBoundCalendar\(id:string,pageToken\?:string,timeMin\?:string,timeMax\?:string\)/);
 assert.match(native,/await this.bound\(id,'calendar'\);await this.calendar\(id\);/);
 assert.match(native,/return this.eventsForBoundCalendar\(id,pageToken,timeMin,timeMax\)/);
 assert.match(brain,/current.revision!==proof.revision/);
 assert.match(brain,/GOOGLE_CALENDAR_SCOPE_AMBIGUOUS/);
 assert.doesNotMatch(brain,/native\.session\.googleCalendarId\s*=\s*/);
});


test('Clara native scheduling accepts an explicit bounded request but never treats text as approval',()=>{
 const request=[
  'Clara, prépare maintenant la création du rendez-vous suivant :',
  'Titre : TEST Clara OS — Agenda',
  'Date : lundi 9 novembre 2026',
  'Heure : 10 h à 10 h 30, heure de Paris',
  'Calendrier : Melodie Digital Calendar',
  'Invités : aucun',
  'Description : Vérification de la création de rendez-vous depuis Clara OS.',
  "Ne crée aucun événement avant mon accord."
 ].join('\n');
 assert.deepEqual(parseNativeCalendarChatDraft(request),{
  calendarName:'Melodie Digital Calendar',name:'TEST Clara OS — Agenda',
  start:'2026-11-09T10:00:00+01:00',end:'2026-11-09T10:30:00+01:00',
  description:'Vérification de la création de rendez-vous depuis Clara OS.'
 });
 for(const text of [
  'Voici un résumé du rendez-vous prévu.',
  request.replace('prépare maintenant','ne prépare pas'),
  request.replace('Invités : aucun','Invités : team@example.org'),
  request.replace('Date : lundi 9 novembre 2026','Date : mardi 31 février 2026'),
  request.replace('Heure : 10 h à 10 h 30','Heure : 11 h à 10 h 30'),
  request.replace('Calendrier : Melodie Digital Calendar','Calendrier : primary'),
 ]) assert.equal(parseNativeCalendarChatDraft(text)?.calendarName==='primary'?null:parseNativeCalendarChatDraft(text),null);
 const spring=request.replace('Date : lundi 9 novembre 2026','Date : dimanche 29 mars 2026').replace('Heure : 10 h à 10 h 30','Heure : 2 h à 2 h 30');
 assert.equal(parseNativeCalendarChatDraft(spring),null);
 const autumn=request.replace('Date : lundi 9 novembre 2026','Date : dimanche 25 octobre 2026').replace('Heure : 10 h à 10 h 30','Heure : 2 h à 2 h 30');
 assert.equal(parseNativeCalendarChatDraft(autumn),null);
 const route=readFileSync('src/app/api/clara/chat/route.ts','utf8');
 const module=readFileSync('src/lib/native/calendar-chat-prepare.ts','utf8');
 assert.match(route,/nativeGoogleProposal/);
 assert.match(module,/googleWorkCommand\('resources'/);
 assert.match(module,/work\.prepare\(/);
 assert.doesNotMatch(module,/executeGoogleWork/);
});
