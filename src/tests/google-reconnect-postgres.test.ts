import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
function moduleFrom(file:string,modules:Record<string,unknown>){const exports:Record<string,unknown>={},require=createRequire(resolve(file));vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>modules[name]??require(name),Response,Request,URL,console,process,crypto:globalThis.crypto});return exports;}
import {seedGoogleWork,workScopes} from './helpers/native-google-work-fixture';
import {verifyOAuthState} from '@/lib/auth/oauth/state';
import * as scoped from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {googleConfig} from '@/lib/config/google';
import {RegistryError,type RegistryQuery} from '@/lib/canonical/registry';

test('Google reconnect: real PostgreSQL status gate, unchanged rights, existing connection and exact scopes',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{return pg(`SELECT row_to_json(r) FROM (${statement})r`).split('\n').filter(Boolean).map(row=>JSON.parse(row));}catch(error){const text=String((error as {stderr:unknown}).stderr),match=text.match(/ERROR:\s+([A-Z0-9]{5}):\s+([^\n]+)/);throw {code:match?.[1],message:match?.[2]};}};
 const commands=scoped.nativeCommands(query),digest=(u:string)=>createHash('sha256').update(u.repeat(43)).digest('hex');
 const create=async(u:string)=>String((await commands({digest:digest(u),workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:'native:new'},'create')).sessionId);
 const a=await create('A'),b=await create('B');seedGoogleWork(pg);
 const savedConfig={...googleConfig};Object.assign(googleConfig,{clientId:'synthetic-google-client',clientSecret:'synthetic-google-secret',redirectUri:'https://os.fixture.example/api/connections/google/callback'});t.after(()=>Object.assign(googleConfig,savedConfig));
 const originalOrigin=process.env.CLARA_AUTH_APP_ORIGIN,originalKey=process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 t.after(()=>{if(originalOrigin===undefined)delete process.env.CLARA_AUTH_APP_ORIGIN;else process.env.CLARA_AUTH_APP_ORIGIN=originalOrigin;if(originalKey===undefined)delete process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;else process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=originalKey;});
 const request=(body:Record<string,unknown>,u='A',session=a,project='p1')=>new Request('https://os.fixture.example/api/connections/google?'+new URLSearchParams({workspaceId:'w',clientId:'c1',projectId:project,sessionId:session}),{method:'POST',headers:{origin:'https://os.fixture.example',cookie:'clara_auth_session='+u.repeat(43),'Content-Type':'application/json'},body:JSON.stringify(body)});
 const bridge={...scoped,withNativeScope:<T>(r:Request,w:boolean,f:()=>Promise<T>)=>scoped.withNativeScope(r,w,f,query),nativeRequest:async(r:Request,f:()=>Promise<Response>)=>{try{return await scoped.withNativeScope(r,true,f,query);}catch(error){return nativeFailure(error);}}};
 const route=moduleFrom('src/app/api/connections/google/route.ts',{'@/lib/native/scoped-context':bridge}) as {POST:(r:Request)=>Promise<Response>};
 const connect=moduleFrom('src/app/api/connections/google/connect/route.ts',{'@/lib/native/scoped-context':bridge}) as {POST:(r:Request)=>Promise<Response>};
 const pick=()=>route.POST(request({action:'select',connectionId:'google-work-a'}));
 pg("UPDATE clara_connections SET status='RECONNECT_REQUIRED' WHERE id='google-work-a'");
 const before=pg("SELECT jsonb_build_object('scope',scopes,'credential_hash',encode(sha256(convert_to(encrypted_payload,'UTF8')),'hex')) FROM clara_connections JOIN clara_connection_credentials ON connection_id=id WHERE id='google-work-a'");
 // Same real owner, identity and full project rights. Status alone triggers this denial.
 const denied=await pick();assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{success:false,code:'NATIVE_GOOGLE_REAUTH_REQUIRED'});
 assert.equal(pg("SELECT data ? 'googleConnectionId' FROM clara_sessions WHERE id='"+a+"'"),'f');
 const consent=await connect.POST(request({connectionId:'google-work-a',capability:'reconnect',returnTo:'agenda'}));assert.equal(consent.status,200);const url=new URL((await consent.json()).authorizationUrl);assert.equal(verifyOAuthState(url.searchParams.get('state')!,{provider:'google',nonce:url.searchParams.get('nonce')!}).redirectPath,'/agenda');
 assert.deepEqual(url.searchParams.get('scope')!.split(' ').sort(),[...workScopes].sort());assert.ok(!url.searchParams.get('scope')!.split(' ').includes('https://www.googleapis.com/auth/drive'));
 assert.equal(pg("SELECT COUNT(*) FROM clara_connections WHERE provider='google'"),'3');
 assert.equal(pg("SELECT jsonb_build_object('scope',scopes,'credential_hash',encode(sha256(convert_to(encrypted_payload,'UTF8')),'hex')) FROM clara_connections JOIN clara_connection_credentials ON connection_id=id WHERE id='google-work-a'"),before,'Preparing consent changes neither status/scopes nor encrypted credentials');
 assert.equal((await connect.POST(request({capability:'reconnect'}))).status,400);
 assert.equal((await connect.POST(request({connectionId:'google-work-a',capability:'reconnect',returnTo:'//attacker.invalid'}))).status,400);
 assert.equal((await connect.POST(request({connectionId:'google-work-a',capability:'reconnect',scopes:['https://www.googleapis.com/auth/drive']}))).status,400);
 pg("UPDATE clara_workspace_memberships SET role='member' WHERE user_id='a' AND workspace_id='w'");assert.equal((await connect.POST(request({connectionId:'google-work-a',capability:'reconnect'}))).status,403);pg("UPDATE clara_workspace_memberships SET role='owner' WHERE user_id='a' AND workspace_id='w'");
 assert.equal((await connect.POST(request({connectionId:'unknown-connection',capability:'reconnect'}))).status,403);
 assert.equal(pg("SELECT COUNT(*) FROM clara_connections WHERE id='unknown-connection'"),'0');
 assert.equal((await connect.POST(request({connectionId:'google-work-a',capability:'reconnect'},'B',b))).status,403);
 assert.equal((await route.POST(request({action:'select',connectionId:'google-work-a'},'A',a,'p2'))).status,403);
 pg("UPDATE clara_registry_project_access SET can_read=false,can_archive=false,can_manage=false WHERE workspace_id='w' AND project_id='p1' AND user_id='a'");assert.equal((await pick()).status,403);pg("UPDATE clara_registry_project_access SET can_read=true,can_archive=true,can_manage=true WHERE workspace_id='w' AND project_id='p1' AND user_id='a'");
 pg("UPDATE clara_connections SET status='ACTIVE' WHERE id='google-work-a'");assert.equal((await pick()).status,200);assert.equal(pg("SELECT data->>'googleConnectionId' FROM clara_sessions WHERE id='"+a+"'"),'google-work-a');
 pg("UPDATE clara_native_google_authority SET revoked_at=NOW(),revision=revision+1 WHERE connection_id='google-work-a'");assert.equal((await pick()).status,403);
 // Unknown/private database text must remain generic, never published.
 await scoped.withNativeScope(request({}),false,async()=>{
  const {nativeGoogleCommands}=await import('@/lib/native/google-authority');
  for(const failure of [{code:'42501',message:'PRIVATE_DIAGNOSTIC'},{code:'42501',message:'NATIVE_GOOGLE_SCOPE_DENIED'},{code:'XX000',message:'NATIVE_GOOGLE_REAUTH_REQUIRED'}]){
   await assert.rejects(()=>nativeGoogleCommands(async()=>{throw failure;})('authority',{connectionId:'google-work-a'}),error=>error instanceof RegistryError&&error.code===(failure.code==='42501'?'REGISTRY_ACCESS_DENIED':'REGISTRY_UNAVAILABLE'));
  }
 },query);
});
