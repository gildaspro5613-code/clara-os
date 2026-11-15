import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeMakeDriveReadPayload} from '@/lib/connectors/make/native-drive-read-payload';
test('Make Drive receives only the canonical native workspaceId and the document query',()=>{
 assert.deepEqual(nativeMakeDriveReadPayload('melodie-digital',{query:'  fiche technique danse  '}),{
  workspaceId:'melodie-digital',query:'fiche technique danse',
 });
});
test('Model cannot select a different tenant, scenario or action',()=>{
 for(const input of [
  {query:'fiche',workspaceId:'another-customer'},
  {query:'fiche',scenarioId:99},
  {query:'fiche',missionId:'arbitrary'},
  {query:'fiche',token:'secret'},
  {query:'a'.repeat(201)},
  {query:''},
  {query:'x\ny'},
  {},
 ]){
  assert.throws(()=>nativeMakeDriveReadPayload('melodie-digital',input));
 }
 assert.throws(()=>nativeMakeDriveReadPayload('other/tenant',{query:'file'}));
});
