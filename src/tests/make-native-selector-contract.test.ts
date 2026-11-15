import test from 'node:test';
import assert from 'node:assert/strict';
import {RegistryError} from '@/lib/canonical/registry';
import {MakeDriveFindCapabilityDefinition} from '@/lib/capabilities/make-scenario/capability';
import {nativeBuilderReadSelectionInstructions,selectAndExecuteNativeBuilderRead} from '@/lib/connectors/core/native-connector-builder-selection';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {executeScopedConnectorRead,NativeConnectorReadDenied,type NativeConnectorReadProof} from '@/lib/connectors/core/native-connector-read-gateway';
import {nativeMakeDriveReadPayload} from '@/lib/connectors/make/native-drive-read-payload';

const key='make.drive.find';
const scope={userId:'fixture-user',workspaceId:'fixture-workspace',clientId:'fixture-client',projectId:'fixture-project',sessionId:'fixture-session'};
const proof:NativeConnectorReadProof={...scope,provider:'make',capabilityId:key,connectionId:'fixture-connection',revision:1,catalogRevision:1};
const authorized=[{provider:'make',capabilityId:key,connectionId:proof.connectionId,revision:1,catalogRevision:1}];
const directory=new ConnectorBuilderDirectory();

test('Make cognitive selection receives the existing reviewed input contract only when eligible',()=>{
 const instructions=nativeBuilderReadSelectionInstructions([key]);
 assert.ok(instructions.includes(JSON.stringify(MakeDriveFindCapabilityDefinition.inputSchema)));
 assert.ok(instructions.includes(MakeDriveFindCapabilityDefinition.description));
 assert.match(instructions,/\{"query":"RTSE Angers"\}/);
 assert.doesNotMatch(instructions,/fixture-connection|fixture-workspace/);
 assert.doesNotMatch(nativeBuilderReadSelectionInstructions(['brevo.list.read']),/folderId|RTSE Angers/);
});

// Synthetic cognitive outputs, NOT the unavailable Production incident arguments.
async function isolatedRead(input:unknown,grant:NativeConnectorReadProof|null=proof){
 const phases:string[]=[],payloads:unknown[]=[];
 const result=await selectAndExecuteNativeBuilderRead('Cherche RTSE Angers avec Make',authorized,{
  async select(){return {success:true,responseStatus:'completed',toolCalls:[{
   callId:'fixture-call',name:'clara_connector_read',arguments:JSON.stringify({capabilityId:key,inputJson:JSON.stringify(input)}),
  }]};},
  async execute(call){
   try{
    const read=await executeScopedConnectorRead(scope,call.name,JSON.parse(call.arguments),directory,
     {async authorize(){return grant;}},
     {async execute(request){
      let payload:ReturnType<typeof nativeMakeDriveReadPayload>;
      try{payload=nativeMakeDriveReadPayload(request.workspaceId,request.input);}
      catch{throw new RegistryError(400,'CONNECTOR_BUILDER_MAKE_QUERY_DENIED');}
      // Provider seam: record payload and return a synthetic Drive result; no HTTP/SQL.
      payloads.push(payload);
      return {provider:'make',capabilityId:key,connectionId:proof.connectionId,status:'completed',
       data:{fileId:payload.folderId?'fixture-file-id':'fixture-folder-id',mimeType:payload.folderId?'application/pdf':'application/vnd.google-apps.folder'}};
     }},
     {async record(event){phases.push(event.phase);}});
    return {callId:call.callId,capabilityId:key,available:true,content:read.summary};
   }catch(error){
    if(!(error instanceof NativeConnectorReadDenied))throw error;
    return {callId:call.callId,capabilityId:key,available:false,content:error.safeReason??error.code};
   }
  },
 });
 return {result,phases,payloads};
}

test('isolated cognitive JSON -> gateway -> real validator -> stub: folder then scoped file',async()=>{
 const first=await isolatedRead({query:'RTSE Angers'});
 assert.equal(first.result?.available,true);
 assert.deepEqual(first.phases,['REQUESTED','SUCCEEDED']);
 assert.deepEqual(first.payloads,[{workspaceId:scope.workspaceId,query:'RTSE Angers'}]);
 const summary=JSON.parse(first.result!.content!);
 const folderId=summary.results.fileId;
 assert.equal(summary.results.mimeType,'application/vnd.google-apps.folder');
 const next=await isolatedRead({query:'D-Cables et Coffrets 2.pdf',folderId});
 assert.equal(next.result?.available,true);
 assert.deepEqual(next.payloads,[{workspaceId:scope.workspaceId,query:'D-Cables et Coffrets 2.pdf',folderId}]);
});

test('optional folder values and Unicode folder titles keep their reviewed meaning',async()=>{
 for(const folderId of [undefined,null,'']){
  const output=await isolatedRead({query:'06 - D Électricité et câblage',...(folderId===undefined?{}:{folderId})});
  assert.equal(output.result?.available,true);
  assert.deepEqual(output.payloads,[{workspaceId:scope.workspaceId,query:'06 - D Électricité et câblage'}]);
 }
});

test('missing contract can reproduce REQUESTED -> FAILED, without reaching provider seam',async()=>{
 for(const input of [{q:'RTSE Angers'},{name:'RTSE Angers'},{payload:{query:'RTSE Angers'}},{query:'RTSE Angers',scenarioKey:'find-drive-document'}]){
  const output=await isolatedRead(input);
  assert.equal(output.result?.content,'CONNECTOR_BUILDER_MAKE_QUERY_DENIED');
  assert.deepEqual(output.phases,['REQUESTED','FAILED']);
  assert.deepEqual(output.payloads,[]);
 }
});

test('malformed, oversized and authority-smuggling inputs never reach stub',async()=>{
 for(const input of [null,[],{}, {query:12},{query:''},{query:'x\ny'},{query:'x'.repeat(201)},
  {query:'RTSE Angers',folderId:42},{query:'RTSE Angers',folderId:'../folder'},
  {query:'RTSE Angers',workspaceId:'foreign'}, {query:'RTSE Angers',connectionId:'foreign'},
  {query:'RTSE Angers',token:'fixture-secret'},JSON.parse('{"query":"RTSE Angers","__proto__":{}}')]){
  const output=await isolatedRead(input);
  assert.equal(output.result?.available,false);
  assert.deepEqual(output.payloads,[]);
  assert.doesNotMatch(output.result?.content??'',/fixture-secret/);
 }
});

test('correct argument contract cannot grant absent or cross-scope native authority',async()=>{
 for(const grant of [null,{...proof,userId:'foreign'},{...proof,workspaceId:'foreign'},{...proof,clientId:'foreign'},{...proof,projectId:'foreign'}]){
  const output=await isolatedRead({query:'RTSE Angers'},grant);
  assert.equal(output.result?.available,false);
  assert.deepEqual(output.payloads,[]);
  assert.deepEqual(output.phases,['DENIED']);
 }
});
