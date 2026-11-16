import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedMakeDriveFolderFromRead,makeDriveFolderHintForRequest} from '@/lib/connectors/core/native-make-drive-folder-continuity';
import {nativeBuilderReadSelectionInstructions,selectAndExecuteNativeBuilderRead} from '@/lib/connectors/core/native-connector-builder-selection';

const scope={userId:'u1',workspaceId:'w1',clientId:'c1',projectId:'p1',sessionId:'s1'};
const parentId='1AqX95-c0m4a4hpKmZC20T5QZHc6wX3_l';
const date=new Date('2026-11-16T06:45:00Z');
const receipt=(values:Record<string,unknown>={})=>JSON.stringify({
 provider:'make',capabilityId:'make.drive.find',
 results:{status:'completed',provider:'google-drive',
  fileId:parentId,fileName:'RTSE Angers',
  mimeType:'application/vnd.google-apps.folder',...values},
});
const message='Clara, dans le dossier Google Drive « RTSE Angers » que tu viens de retrouver, recherche via Make le sous-dossier « 06 - D Électricité et câblage ».';

test('only a completed, exact native Make Drive folder receipt creates a hint',()=>{
 const folder=confirmedMakeDriveFolderFromRead(receipt(),scope,date);
 assert.deepEqual(folder,{fileId:parentId,fileName:'RTSE Angers',
  observedAt:'2026-11-16T06:45:00.000Z',scope});
 for(const bad of [
  receipt({status:'failed'}),receipt({mimeType:'application/pdf'}),
  receipt({fileId:'../folder'}),receipt({fileName:'bad\nfolder'}),
  receipt({provider:'fake'}),'{',JSON.stringify({provider:'brevo',capabilityId:'make.drive.find',results:{status:'completed'}}),
 ]){
  assert.equal(confirmedMakeDriveFolderFromRead(bad,scope,date),null);
 }
});

test('same-scoped immediate subfolder request reuses provider-confirmed parent ID only as a hint',()=>{
 const folder=confirmedMakeDriveFolderFromRead(receipt(),scope,date)!;
 assert.deepEqual(makeDriveFolderHintForRequest(folder,scope,message,new Date('2026-11-16T06:56:00Z')),
  {fileId:parentId,fileName:'RTSE Angers'});
 assert.deepEqual(makeDriveFolderHintForRequest(folder,scope,
  'Clara, dans ce dossier, recherche via Make le fichier D-Cables et Coffrets 2.pdf.',date),
  {fileId:parentId,fileName:'RTSE Angers'});
});

test('no hint outside same native authority, stale result, or ambiguous/direct parent search',()=>{
 const folder=confirmedMakeDriveFolderFromRead(receipt(),scope,date)!;
 for(const other of [
  {...scope,userId:'other'}, {...scope,workspaceId:'other'}, {...scope,clientId:'other'},
  {...scope,projectId:'other'}, {...scope,sessionId:'other'},
 ]){
  assert.equal(makeDriveFolderHintForRequest(folder,other,message,date),null);
 }
 assert.equal(makeDriveFolderHintForRequest(folder,scope,message,new Date('2026-11-17T06:45:00Z')),null);
 assert.equal(makeDriveFolderHintForRequest(folder,scope,'Clara, recherche RTSE Angers via Make.',date),null);
 assert.equal(makeDriveFolderHintForRequest(folder,scope,'Clara, recherche via Make un autre dossier.',date),null);
 assert.equal(makeDriveFolderHintForRequest(folder,scope,'Supprime ce dossier.',date),null);
 assert.equal(makeDriveFolderHintForRequest({fileId:parentId,fileName:'RTSE Angers',scope,observedAt:'bad'},scope,message,date),null);
});

test('selector receives only the single prior folder reference, never an access grant',async()=>{
 const folder=confirmedMakeDriveFolderFromRead(receipt(),scope,date)!;
 const hint=makeDriveFolderHintForRequest(folder,scope,message,date)!;
 const instructions=nativeBuilderReadSelectionInstructions(['make.drive.find'],hint);
 assert.match(instructions,/1AqX95-c0m4a4hpKmZC20T5QZHc6wX3_l/);
 assert.match(instructions,/not authorization|not authority|neither grants/i);
 assert.doesNotMatch(instructions,/userId|workspaceId|clientId|projectId|sessionId/);
 assert.doesNotMatch(nativeBuilderReadSelectionInstructions(['brevo.list.read'],hint),/1AqX95/);
 let selected=0,executed=0;
 const result=await selectAndExecuteNativeBuilderRead(message,[{provider:'make',capabilityId:'make.drive.find',
  connectionId:'not-a-prompt-input',revision:1,catalogRevision:1}],{
  async select(request,capabilities,received){
   selected++;
   assert.equal(request,message);
   assert.deepEqual(capabilities,['make.drive.find']);
   assert.deepEqual(received,hint);
   return {success:true,responseStatus:'completed',toolCalls:[{
    callId:'call',name:'clara_connector_read',
    arguments:JSON.stringify({capabilityId:'make.drive.find',
     inputJson:JSON.stringify({query:'06 - D Électricité et câblage',folderId:received!.fileId})}),
   }]};
  },
  async execute(call){
   executed++;assert.deepEqual(JSON.parse(call.arguments),{
    query:'06 - D Électricité et câblage',folderId:parentId});
   return {callId:call.callId,capabilityId:call.name,available:true,source:'make',content:receipt()};
  },
 },hint);
 assert.equal(selected,1);assert.equal(executed,1);assert.equal(result?.available,true);
});

test('context never relaxes strict selector arguments or enables unauthorized provider',async()=>{
 const folder=confirmedMakeDriveFolderFromRead(receipt(),scope,date)!;
 const hint=makeDriveFolderHintForRequest(folder,scope,message,date)!;
 let executed=0;
 const bad=await selectAndExecuteNativeBuilderRead(message,[{provider:'make',capabilityId:'make.drive.find',
  connectionId:'not-a-prompt-input',revision:1,catalogRevision:1}],{
  async select(){return {success:true,responseStatus:'completed',toolCalls:[{
   callId:'call',name:'clara_connector_read',
   arguments:JSON.stringify({capabilityId:'make.drive.find',
    inputJson:'{"query":"name contains xyz"}',workspaceId:'forged'}),
  }]};},
  async execute(){executed++;throw Error('must not call');},
 },hint);
 assert.equal(bad,null);assert.equal(executed,0);
});
