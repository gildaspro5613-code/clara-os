import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {assertGoogleSignInAllowed} from '../lib/auth/google-sign-in-policy';
import {validateRecetteDatabaseBinding} from '../lib/recette/database-binding';
import * as guard from '../lib/recette/external-execution-guard';

const host='ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech';
const settings={VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',
 CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:host,
 DATABASE_URL:`postgresql://clara_os_recette_limited:synthetic@${host}/neondb?sslmode=require`,
 CLARA_AUTH_APP_ORIGIN:'https://clara-os-recette.vercel.app',CLARA_AUTH_GOOGLE_REDIRECT_URI:'https://clara-os-recette.vercel.app/api/auth/google/callback',
 GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret',CLARA_AUTH_BOOTSTRAP_EMAIL:'synthetic@example.test'};
function configure(t: Parameters<Parameters<typeof test>[1]>[0]) {
 const keys=[...Object.keys(settings),'POSTGRES_URL','CLARA_OS_RUNTIME_MODE'];
 const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 t.after(()=>{for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 delete process.env.POSTGRES_URL;delete process.env.CLARA_OS_RUNTIME_MODE;Object.assign(process.env,settings);
}
function load<T>(path:string,overrides:Record<string,unknown>,http:typeof fetch=fetch) {
 const exports:Record<string,unknown>={},require=createRequire(resolve(path));
 vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {exports,require:(id:string)=>overrides[id]??require(id),process,console,Buffer,URL,URLSearchParams,AbortSignal,fetch:http});
 return exports as T;
}

test('Google-only Recette exception refuses incomplete, Production, foreign binding and unsafe callback configurations',t=>{
 configure(t);assert.doesNotThrow(assertGoogleSignInAllowed);
 for(const [key,value] of Object.entries({VERCEL_ENV:'production',VERCEL_TARGET_ENV:'preview',VERCEL_PROJECT_ID:'other',CLARA_RECETTE_MODE:'',
  CLARA_RECETTE_NEON_BRANCH_ID:'main',DATABASE_URL:settings.DATABASE_URL.replace(host,'ep-other.eu.neon.tech'),POSTGRES_URL:'synthetic',
  CLARA_AUTH_APP_ORIGIN:'https://clara-os.vercel.app',CLARA_AUTH_GOOGLE_REDIRECT_URI:'https://foreign.example.test/callback'})){
  const previous=process.env[key];process.env[key]=value;assert.throws(assertGoogleSignInAllowed,/RECETTE_EXTERNAL_EXECUTION_DENIED/);
  if(previous===undefined)delete process.env[key];else process.env[key]=previous;
 }
 for(const suffix of ['#fragment', '&options=unsafe'])assert.equal(validateRecetteDatabaseBinding({...process.env,DATABASE_URL:settings.DATABASE_URL+suffix}),'FAIL');
 assert.throws(()=>guard.assertRecetteExternalExecutionBlocked('google.workspace-oauth'),/DENIED/);
 assert.throws(()=>guard.assertRecetteExternalExecutionBlocked('canonical.live'),/DENIED/);
});

test('real Google verifier and completion: signed identity only, one-time state, no Recette bootstrap, no business transport',async t=>{
 configure(t);
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'synthetic-key',use:'sig'};
 const nonce='n'.repeat(43),state='s'.repeat(43);let consumed=false,enrolled=true,issued=0,grants=0,exchange=0,jwks=0;
 const claims={iss:'https://accounts.google.com',aud:'synthetic-client',sub:'enrolled-subject',given_name:'Gildas',exp:Math.floor(Date.now()/1000)+300,nonce,email:'synthetic@example.test',email_verified:true};
 const jwt=(changes:Record<string,unknown>={})=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url'),p=Buffer.from(JSON.stringify({...claims,...changes})).toString('base64url');return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');};
 let token=jwt();
 const http:typeof fetch=async(input,init)=>{
  assert.equal(init?.redirect,'error');assert.ok(init?.signal);
  if(String(input)==='https://oauth2.googleapis.com/token'){
   exchange++;assert.equal(init?.method,'POST');assert.equal((init?.body as URLSearchParams).get('grant_type'),'authorization_code');
   return Response.json({id_token:token});
  }
  assert.equal(String(input),'https://www.googleapis.com/oauth2/v3/certs');jwks++;return Response.json({keys:[jwk]});
 };
 const auth=load<typeof import('../lib/auth/google-sign-in')>('src/lib/auth/google-sign-in.ts',{
  '@/lib/recette/external-execution-guard':guard,'./google-sign-in-policy':{assertGoogleSignInAllowed},
  '@/lib/core/store/database':{sql:()=>{grants++;throw Error('UNEXPECTED_WRITE');}},
  './verified-identity':{findVerifiedUser:async()=>enrolled?'canonical-user':null,enrollVerifiedIdentity:async()=>{grants++;throw Error('UNEXPECTED_ENROLLMENT');}},
  './sign-in-transaction':{consumeSignInTransaction:async(provider:string,s:string,n:string)=>{assert.equal(provider,'google');if(consumed||s!==state||n!==nonce)return false;consumed=true;return true;}},
  './verified-sign-in':{completeVerifiedSignIn:async(identity:{subject:string})=>{assert.equal(identity.subject,'enrolled-subject');issued++;return 'synthetic-session';}},
 },http);
 const url=new URL(auth.googleSignInAuthorizationUrl(state,nonce));assert.equal(url.searchParams.get('scope'),'openid profile email');
 const profiles:unknown[]=[];
 assert.equal(await auth.completeGoogleSignIn('code',state,nonce,name=>profiles.push(name)),'synthetic-session');assert.deepEqual(profiles,['Gildas']);
 await assert.rejects(auth.completeGoogleSignIn('code',state,nonce,name=>profiles.push(name)),/REPLAYED/);assert.equal(profiles.length,1);assert.equal(issued,1);
 for(const change of [{iss:'https://foreign.example.test'},{aud:'wrong'},{azp:'wrong'},{exp:0},{nonce:'wrong'}]){
  token=jwt(change);await assert.rejects(auth.completeGoogleSignIn('code',state,nonce,name=>profiles.push(name)));assert.equal(profiles.length,1);assert.equal(issued,1);
 }
 token=jwt();const parts=token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);token=parts.join('.');
 await assert.rejects(auth.completeGoogleSignIn('code',state,nonce,name=>profiles.push(name)),/SIGNATURE/);assert.equal(profiles.length,1);
 consumed=false;enrolled=false;token=jwt();await assert.rejects(auth.completeGoogleSignIn('code',state,nonce,name=>profiles.push(name)),/IDENTITY_NOT_ENROLLED/);assert.equal(profiles.length,1);
 assert.equal(grants,0);assert.equal(issued,1);assert.ok(exchange>0&&jwks>0);
 const before=exchange;process.env.VERCEL_ENV='production';await assert.rejects(auth.completeGoogleSignIn('code',state,nonce),/DENIED/);assert.equal(exchange,before);
});

test('actual start route refuses invalid Recette before transaction or redirect',async t=>{
 configure(t);process.env.VERCEL_TARGET_ENV='production';let calls=0;
 const route=load<typeof import('../app/api/auth/google/start/route')>('src/app/api/auth/google/start/route.ts',{
  '@/lib/auth/google-sign-in-policy':{assertGoogleSignInAllowed},
  '@/lib/auth/sign-in-transaction':{beginSignInTransaction:async()=>{calls++;throw Error('UNEXPECTED_SQL');}},
  '@/lib/auth/google-sign-in':{googleSignInAuthorizationUrl:()=>{calls++;throw Error('UNEXPECTED_REDIRECT');}},
 });
 const logger=t.mock.method(console,'error',()=>{});try{const response=await route.GET();assert.equal(response.status,503);assert.equal(calls,0);}finally{logger.mock.restore();}
});

test('actual database entry refuses ambiguous Recette before Neon client construction; outside Recette unchanged',t=>{
 configure(t);let clients=0,queries=0;
 const db=load<typeof import('../lib/core/store/database')>('src/lib/core/store/database.ts',{
  '@/lib/recette/external-execution-guard':guard,'@/lib/recette/database-binding':{validateRecetteDatabaseBinding},
  '@neondatabase/serverless':{neon:()=>{clients++;return()=>{queries++;return [];};}},
 });
 process.env.POSTGRES_URL='synthetic';assert.throws(()=>db.sql`SELECT 1`,/RECETTE_DATABASE_REFUSED/);assert.equal(clients,0);
 delete process.env.POSTGRES_URL;void db.sql`SELECT 1`;assert.equal(queries,1);
 delete process.env.CLARA_RECETTE_MODE;delete process.env.VERCEL_PROJECT_ID;delete process.env.VERCEL_TARGET_ENV;process.env.VERCEL_ENV='production';void db.sql`SELECT 1`;assert.equal(queries,2);
});
