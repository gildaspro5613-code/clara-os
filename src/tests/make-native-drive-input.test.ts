import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeMakeDriveReadPayload} from '@/lib/connectors/make/native-drive-read-payload';
test('Make Drive receives only the canonical native workspaceId and the document query',()=>{
 assert.deepEqual(nativeMakeDriveReadPayload('melodie-digital',{query:'  fiche technique danse  '}),{
  workspaceId:'melodie-digital',query:'fiche technique danse',
 });
});
test('Clara normalizes old Drive syntax to a plain name and scopes searches to a folder',()=>{
 assert.deepEqual(nativeMakeDriveReadPayload('melodie-digital',{query:"name contains 'RTSE ANGERS'"}),{
  workspaceId:'melodie-digital',query:'RTSE ANGERS',
 });
 assert.deepEqual(nativeMakeDriveReadPayload('melodie-digital',{query:'RTSE Angers'}),{
  workspaceId:'melodie-digital',query:'RTSE Angers',
 });
 assert.deepEqual(nativeMakeDriveReadPayload('melodie-digital',{
  query:' fiche technique ',folderId:'1RTSEAngersValidId_2026',
 }),{workspaceId:'melodie-digital',query:'fiche technique',folderId:'1RTSEAngersValidId_2026'});
});
test('Model cannot select a different tenant, scenario or action',()=>{
 for(const input of [
  {query:'fiche',workspaceId:'another-customer'},
  {query:'fiche',scenarioId:99},
  {query:'fiche',missionId:'arbitrary'},
  {query:'fiche',token:'secret'},
  {query:'a'.repeat(201)},
  {query:'fiche',folderId:'bad id with whitespace'},
  {query:'fiche',folderId:'../another-tenant'},
  {query:'fiche',folderId:123},
  {query:'fiche',folderId:'1RTSEAngersValidId_2026',operation:'delete'},
  {query:''},
  {query:'x\ny'},
  {},
 ]){
  assert.throws(()=>nativeMakeDriveReadPayload('melodie-digital',input));
 }
 assert.throws(()=>nativeMakeDriveReadPayload('other/tenant',{query:'file'}));
});
