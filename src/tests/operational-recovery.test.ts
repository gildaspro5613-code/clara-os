import test from 'node:test';
import assert from 'node:assert/strict';
import {missionMutationRequested} from '@/lib/core/orchestrator';
import {documentDiagnostic} from '@/lib/documents/document-read-error';
import {parseNativeCalendarReadIntent,matchesAuthorizedCalendarName} from '@/lib/brain/calendar-read-intent';
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
 assert.match(src,/work\.calendar\(calendarId\)/);
 assert.match(src,/matchesAuthorizedCalendarName\(selectedName,intent\.expectedName\)/);
 assert.match(src,/work\.events\(undefined,timeMin,timeMax\)/);
 assert.match(src,/GOOGLE_CALENDAR_NAME_MISMATCH/);
 assert.match(src,/GOOGLE_CALENDAR_RANGE_UNSUPPORTED/);
 assert.match(src,/partial=Boolean\(result\.nextPageToken\)/);
 assert.match(src,/revalidate\('calendar:'\+connectionId/);
 assert.doesNotMatch(src,/calendarId:\s*['"]primary['"]/);
});
