import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { execFileSync } from 'node:child_process';
import { neonConfig } from '@neondatabase/serverless';
import { configureRecetteOrigin, recetteDatabase, recetteRequested } from '../lib/recette/policy';
import { installRecetteTransport } from '../lib/recette/transport';
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

test('policy: exact custom target only; missing, contradictory and production configs fail closed',()=>{
 assert.equal(recetteRequested({}),false);
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
