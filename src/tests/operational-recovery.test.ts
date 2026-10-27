import test from 'node:test';
import assert from 'node:assert/strict';
import {missionMutationRequested} from '@/lib/core/orchestrator';
import {documentDiagnostic} from '@/lib/documents/document-read-error';
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
