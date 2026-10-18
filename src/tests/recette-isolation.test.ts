import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { execFileSync } from 'node:child_process';
import { neonConfig } from '@neondatabase/serverless';
import { configureRecetteOrigin, recetteDatabase, recetteRequested } from '../lib/recette/policy';
import { installRecetteTransport } from '../lib/recette/transport';
import { recetteNeonEndpoint, reportRecetteStartupFailure } from '../lib/recette/diagnostics';
import { register } from '../../instrumentation';
import { GET as worker } from '../app/api/internal/event-jobs-run/route';
import { GET as intake } from '../app/api/internal/project-intake-worker/route';
import { GET as purge } from '../app/api/internal/document-operations-purge/route';
import { GET as googleSignIn } from '../app/api/auth/google/start/route';
import { GET as microsoftSignIn } from '../app/api/auth/microsoft/start/route';
import { POST as googleWork } from '../app/api/native/google/work/route';
import { POST as session } from '../app/api/auth/recette/session/route';
import { GET as nativeSession } from '../app/api/clara/session/route';
import { IonosTransport, createIonosTransport, type MailCredentials, type MailEnvelope } from '../lib/connectors/ionos/transport';
import { MakeWebhookClient } from '../lib/connectors/make/client';
import { executeExternalProductCapability } from '../lib/external-capabilities/product-callback';
import { NodeMagicQUdpDatagramSender } from '../lib/connectors/internal/chamsys/magicq/node-udp-sender';
import { OpenAIResponsesEngine } from '../lib/connectors/internal/openai/responses/openai-responses-engine';

const valid: NodeJS.ProcessEnv = {VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',
 CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_HOST:'ep-isolated-test.eu-central-1.aws.neon.tech',
 CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',
 DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-isolated-test.eu-central-1.aws.neon.tech/neondb?sslmode=require',
 VERCEL_URL:'recette-test.vercel.app',CLARA_AUTH_APP_ORIGIN:'https://recette-test.vercel.app'};
const keys=[...Object.keys(valid),'POSTGRES_URL'];
const initial=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function setEnv(env:NodeJS.ProcessEnv){for(const k of keys)delete process.env[k];Object.assign(process.env,env);}
function rows(name:string,values:string[]){return Response.json({fields:[{name,dataTypeID:25}],rows:values.map(v=>[v]),rowCount:values.length,command:'SELECT',rowAsArray:true});}

const dbCases: [string, NodeJS.ProcessEnv][] = [
 ['HOST_MISSING',{CLARA_RECETTE_NEON_HOST:undefined}],
 ['HOST_INVALID',{CLARA_RECETTE_NEON_HOST:'https://host.invalid/secret'}],
 ['BRANCH_MISMATCH',{CLARA_RECETTE_NEON_BRANCH_ID:'foreign-branch'}],
 ['POSTGRES_URL_PRESENT',{POSTGRES_URL:'synthetic-private-postgres-url'}],
 ['DATABASE_URL_MISSING',{DATABASE_URL:undefined}],
 ['DATABASE_URL_INVALID',{DATABASE_URL:'synthetic-private-invalid-url'}],
 ['PROTOCOL_INVALID',{DATABASE_URL:valid.DATABASE_URL!.replace('postgresql:','https:')}],
 ['HOST_MISMATCH',{DATABASE_URL:valid.DATABASE_URL!.replace('ep-isolated-test','ep-foreign-test')}],
 ['ROLE_MISMATCH',{DATABASE_URL:valid.DATABASE_URL!.replace('clara_os_recette_limited','neondb_owner')}],
 ['NAME_MISMATCH',{DATABASE_URL:valid.DATABASE_URL!.replace('/neondb','/foreign')}],
 ['PASSWORD_MISSING',{DATABASE_URL:valid.DATABASE_URL!.replace(':synthetic@','@')}],
 ['FRAGMENT_FORBIDDEN',{DATABASE_URL:valid.DATABASE_URL+'#synthetic-secret'}],
 ['SSL_MODE_COUNT_INVALID',{DATABASE_URL:valid.DATABASE_URL!.replace('?sslmode=require','')}],
 ['SSL_MODE_INVALID',{DATABASE_URL:valid.DATABASE_URL!.replace('sslmode=require','sslmode=disable')}],
 ['PORT_INVALID',{DATABASE_URL:valid.DATABASE_URL!.replace('/neondb',':5433/neondb')}],
 ['QUERY_KEY_FORBIDDEN',{DATABASE_URL:valid.DATABASE_URL+'&options=synthetic-secret'}],
 ['CHANNEL_BINDING_COUNT_INVALID',{DATABASE_URL:valid.DATABASE_URL+'&channel_binding=require&channel_binding=require'}],
 ['CHANNEL_BINDING_INVALID',{DATABASE_URL:valid.DATABASE_URL+'&channel_binding=disable'}],
];
for (const [code,patch] of dbCases) test('safe startup diagnostic: '+code,t=>{
 const logs:unknown[][]=[];t.mock.method(console,'error',(...args:unknown[])=>logs.push(args));
 let caught:unknown;try{recetteDatabase({...valid,...patch});}catch(error){caught=error;}
 assert.ok(caught instanceof Error);assert.equal(caught.message,'RECETTE_DATABASE_REFUSED');
 reportRecetteStartupFailure(caught,valid);
 assert.deepEqual(logs,[['[CLARA_RECETTE_STARTUP]','RECETTE_DB_'+code]]);
 assert.equal(JSON.stringify(caught),'{}');
 const rendered=JSON.stringify(logs)+String(caught)+(caught as Error).stack;
 for(const forbidden of ['synthetic','ep-isolated-test','foreign-branch','neondb_owner','postgresql://'])
  assert.ok(!rendered.includes(forbidden));
 reportRecetteStartupFailure(caught,{...valid,VERCEL_ENV:'production'});
 reportRecetteStartupFailure(caught,{...valid,VERCEL_TARGET_ENV:'preview'});
 reportRecetteStartupFailure(new Error('synthetic-private-error'),valid);
 assert.equal(logs.length,1);
});
for(const [code,value] of [
 ['NEON_ENDPOINT_INVALID','not-an-url'],
 ['NEON_ENDPOINT_PROTOCOL_INVALID','http://api.example.neon.tech/sql'],
 ['NEON_ENDPOINT_HOST_INVALID','https://synthetic-secret.invalid/sql'],
 ['NEON_ENDPOINT_PATH_INVALID','https://api.example.neon.tech/foreign'],
])test('safe transport diagnostic: '+code,t=>{
 const logs:unknown[][]=[];t.mock.method(console,'error',(...args:unknown[])=>logs.push(args));
 assert.throws(()=>recetteNeonEndpoint(()=>value),error=>{
  reportRecetteStartupFailure(error,valid);
  assert.equal((error as Error).message,'RECETTE_DATABASE_REFUSED');
  assert.equal(JSON.stringify(error),'{}');return true;
 });
 assert.deepEqual(logs,[['[CLARA_RECETTE_STARTUP]','RECETTE_DB_'+code]]);
 assert.ok(!JSON.stringify(logs).includes(value));
});

test('actual startup hook logs one safe label; HTTP adapter stays generic; preview is accepted with custom target',async t=>{
 const logs:unknown[][]=[];t.mock.method(console,'error',(...args:unknown[])=>logs.push(args));
 const runtime=process.env.NEXT_RUNTIME;process.env.NEXT_RUNTIME='nodejs';
 const endpoint=neonConfig.fetchEndpoint;
 t.after(()=>{neonConfig.fetchEndpoint=endpoint;if(runtime===undefined)delete process.env.NEXT_RUNTIME;else process.env.NEXT_RUNTIME=runtime;setEnv(initial);});
 setEnv({...valid,POSTGRES_URL:'synthetic-secret'});
 await assert.rejects(register(),{message:'RECETTE_DATABASE_REFUSED'});
 assert.deepEqual(logs,[['[CLARA_RECETTE_STARTUP]','RECETTE_DB_POSTGRES_URL_PRESENT']]);
 const response=await session(new Request('https://recette-test.vercel.app/api/auth/recette/session',{method:'POST'}));
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{success:false,code:'RECETTE_SESSION_UNAVAILABLE'});
 assert.equal(logs.length,1);
 setEnv(valid);neonConfig.fetchEndpoint=()=> 'https://synthetic-secret.invalid/sql';
 await assert.rejects(register(),{message:'RECETTE_DATABASE_REFUSED'});
 assert.deepEqual(logs[1],['[CLARA_RECETTE_STARTUP]','RECETTE_DB_NEON_ENDPOINT_HOST_INVALID']);
 assert.ok(!JSON.stringify(logs).includes('synthetic'));
 assert.equal(recetteDatabase({...valid,POSTGRES_URL:''}).username,'clara_os_recette_limited');
 assert.equal(recetteDatabase({...valid,DATABASE_URL:valid.DATABASE_URL+'&channel_binding=require'}).pathname,'/neondb');
});

test('ordinary Production startup leaves fetch and sockets unchanged and emits no database diagnostic',async t=>{
 const runtime=process.env.NEXT_RUNTIME;
 const fetcher=globalThis.fetch, connect=net.Socket.prototype.connect;
 const logs:unknown[][]=[];t.mock.method(console,'error',(...args:unknown[])=>logs.push(args));
 t.mock.method(console,'info',()=>{});
 t.after(()=>{if(runtime===undefined)delete process.env.NEXT_RUNTIME;else process.env.NEXT_RUNTIME=runtime;setEnv(initial);});
 process.env.NEXT_RUNTIME='nodejs';
 setEnv({VERCEL:'1',VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production'});
 await register();
 assert.equal(globalThis.fetch,fetcher);assert.equal(net.Socket.prototype.connect,connect);
 assert.deepEqual(logs,[]);
});

test('policy: exact custom target only; missing, contradictory and production configs fail closed',()=>{
 assert.equal(recetteRequested({}),false);
 assert.equal(recetteRequested({VERCEL:'1',VERCEL_ENV:'preview'}),true);
 assert.throws(()=>recetteDatabase({VERCEL:'1',VERCEL_ENV:'preview'}),/RECETTE_CONFIGURATION_REFUSED/);
 assert.equal(recetteRequested({VERCEL:'1',VERCEL_ENV:'production'}),false);
 assert.equal(recetteDatabase(valid).username,'clara_os_recette_limited');
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_TARGET_ENV:'production'},{CLARA_RECETTE_MODE:undefined},
  {CLARA_RECETTE_NEON_HOST:undefined},{CLARA_RECETTE_NEON_BRANCH_ID:'main'},
  {DATABASE_URL:valid.DATABASE_URL!.replace('clara_os_recette_limited','neondb_owner')},
  {POSTGRES_URL:'forbidden-fallback'},{DATABASE_URL:'not-a-url'},{VERCEL:undefined},
  {DATABASE_URL:valid.DATABASE_URL+'&options=endpoint%3Dforeign'},
  {DATABASE_URL:valid.DATABASE_URL+'&sslmode=disable'}])
  assert.throws(()=>recetteDatabase({...valid,...patch}),/RECETTE_/);
});

test('session adapter: never issues a session in production; rejects foreign origin, unsigned and expired inputs',async()=>{
 const request=(origin:string)=>new Request('https://recette-test.vercel.app/api/auth/recette/session',{
  method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({workspaceId:'workspace-a',token:'forged'})});
 setEnv({...valid,VERCEL_ENV:'production'});
 assert.equal((await session(request('https://recette-test.vercel.app'))).status,503);
 setEnv({});assert.equal((await session(request('https://recette-test.vercel.app'))).status,404);
 setEnv(valid);assert.equal((await session(request('https://foreign.invalid'))).status,403);
 assert.equal((await session(request('https://recette-test.vercel.app'))).status,403);
 process.env.CLARA_AUTH_APP_ORIGIN='https://production.invalid';
 assert.throws(()=>configureRecetteOrigin(),/RECETTE_ORIGIN_REFUSED/);
});

test('actual entrypoints: missing mode blocks cron, OAuth, Google work, email, Make, Live and UDP before transport',async()=>{
 setEnv({...valid,CLARA_RECETTE_MODE:undefined});delete process.env.CLARA_RECETTE_MODE;
 const request=new Request('https://recette-test.vercel.app/api/internal/event-jobs-run');
 for(const handler of [worker,intake,purge]){
  const response=await handler(request);assert.equal(response.status,403);
  assert.equal((await response.json()).code,'RECETTE_WORKER_BLOCKED');
 }
 for(const handler of [googleSignIn,microsoftSignIn])assert.equal((await handler()).status,403);
 const google=await googleWork(new Request('https://recette-test.vercel.app/api/native/google/work',{method:'POST'}));
 assert.equal(google.status,403);assert.equal((await google.json()).code,'RECETTE_EXTERNAL_OPERATION_BLOCKED');
 const credentials:MailCredentials={address:'clara@melodie.digital',password:'synthetic',imapHost:'imap.ionos.fr',imapPort:993,smtpHost:'smtp.ionos.fr',smtpPort:465,folders:['INBOX'],configurationReviewed:true};
 assert.throws(()=>createIonosTransport(credentials),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 const mail=new IonosTransport(credentials);
 await assert.rejects(mail.folders(),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 await assert.rejects(mail.send({} as MailEnvelope),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 let calls=0;const make=new MakeWebhookClient(async()=>{calls++;throw Error('must not run');});
 await assert.rejects(make.execute({url:'https://hook.eu1.make.com/synthetic'},{scenarioKey:'test'}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 await assert.rejects(executeExternalProductCapability({productId:'clara-live',callbackBaseUrl:'https://live.invalid',token:'synthetic',workspaceId:'test',capabilities:[]},
  {capability:'test',userId:'a',workspaceId:'w',sessionId:'s',context:{}}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 await assert.rejects(new NodeMagicQUdpDatagramSender().send({host:'192.0.2.1',port:6454,payload:new Uint8Array([1])}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 assert.equal(calls,0); // no accepted/sent/completed result, no persistence callback
 assert.throws(()=>installRecetteTransport(),/RECETTE_CONFIGURATION_REFUSED/);
});

test('installed boundary: real session/internal handlers use only Neon; all other fetch/TCP/TLS/UDP/process calls denied',async()=>{
 setEnv(valid);
 let networkCalls=0;const queries:string[]=[];let sessionAllowed=true;
 globalThis.fetch=async(_input,init)=>{
  networkCalls++;
  const query=JSON.parse(String(init?.body)).query as string;queries.push(query);
  if(query.includes('SELECT user_id FROM clara_auth_sessions'))return rows('user_id',sessionAllowed?['user-a']:[]);
  if(query.includes('AS active_fixture'))return Response.json({fields:[{name:'active_fixture',dataTypeID:16},{name:'fixture_membership',dataTypeID:16}],rows:[[false,false]],rowCount:1,command:'SELECT',rowAsArray:true});
  if(query.includes('SELECT workspace_id, role'))return Response.json({fields:[{name:'workspace_id',dataTypeID:25},{name:'role',dataTypeID:25}],rows:[['workspace-a','member']],rowCount:1,command:'SELECT',rowAsArray:true});
  if(query.includes('clara_native_read_session'))return Response.json({fields:[{name:'data',dataTypeID:3802}],rows:[[JSON.stringify({state:'ACTIVE',nativeMissionId:'mission-a',mission:{id:'mission-a',objective:'Recette'}})]],rowCount:1,command:'SELECT',rowAsArray:true});
  throw Error('Unexpected SQL; test must not create identities, sessions or receipts');
 };
 installRecetteTransport();
 const form=()=>new Request('https://recette-test.vercel.app/api/auth/recette/session',{method:'POST',headers:{origin:'https://recette-test.vercel.app','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({workspaceId:'workspace-a',token:'a'.repeat(43)})});
 const accepted=await session(form());assert.equal(accepted.status,303);
 assert.match(accepted.headers.get('set-cookie')??'',/HttpOnly/);
 sessionAllowed=false;assert.equal((await session(form())).status,403);sessionAllowed=true;
 const read=await nativeSession(new Request('https://recette-test.vercel.app/api/clara/session?workspaceId=workspace-a&clientId=client-a&projectId=project-a&sessionId=session-a',{headers:{cookie:'clara_auth_session='+'a'.repeat(43)}}));
 assert.equal(read.status,200);assert.equal((await read.json()).mission.id,'mission-a');
 assert.equal((await nativeSession(new Request('https://recette-test.vercel.app/api/clara/session'))).status,401);
 const simulated=await new OpenAIResponsesEngine().generate({prompt:'Internal test'});
 assert.equal(simulated.success,true);assert.match(simulated.content,/RECETTE/);assert.equal(simulated.toolCalls,undefined);assert.equal(simulated.responseId,undefined);
 const before=networkCalls;
 for(const url of ['https://www.googleapis.com/drive/v3/files','https://hook.eu1.make.com/test','https://live.invalid/api/core/capabilities/execute','https://api.openai.com/v1/responses','http://127.0.0.1/test'])
  await assert.rejects(fetch(url,{method:'POST'}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 const endpoint=typeof neonConfig.fetchEndpoint==='function'?neonConfig.fetchEndpoint(valid.CLARA_RECETTE_NEON_HOST!,5432):neonConfig.fetchEndpoint;
 await assert.rejects(fetch(endpoint,{method:'POST',headers:{'Neon-Connection-String':'foreign'}}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 assert.throws(()=>net.connect({host:'smtp.ionos.fr',port:465}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 assert.throws(()=>tls.connect({host:'smtp.ionos.fr',port:465}),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 const socket=dgram.createSocket('udp4');try{assert.throws(()=>socket.send(Buffer.from('x'),6454,'192.0.2.1'),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);}finally{socket.close();}
 assert.throws(()=>execFileSync('echo',['must-not-execute']),/RECETTE_EXTERNAL_OPERATION_BLOCKED/);
 assert.equal(networkCalls,before);assert.ok(queries.length>=4);
 assert.ok(queries.every(q=>!/^\s*(INSERT|UPDATE|CREATE)/.test(q)));
 setEnv(initial);
});
