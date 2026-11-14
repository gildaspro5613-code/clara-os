import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMakeCloneRuntime,scopedMakeReadCredentialStore} from '@/lib/native/make-scoped-credentials';

const URL='postgresql://clara_make_runtime_login:fixture-only@ep-morning-frog-b2pbns02.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const env={DATABASE_URL:URL,CLARA_MAKE_CLONE_ENCRYPTION_KEY:Buffer.alloc(32,42).toString('base64')} as NodeJS.ProcessEnv;

test('native Make credentials bind only to isolated clone runtime',()=>{
 assert.equal(validateMakeCloneRuntime(env),true);
 for(const changed of [
   {DATABASE_URL:URL.replace('clara_make_runtime_login','neondb_owner')},
   {DATABASE_URL:URL.replace('ep-morning-frog-b2pbns02','another-endpoint')},
   {DATABASE_URL:URL.replace('sslmode=require','sslmode=disable')},
   {DATABASE_URL:URL.replace('/neondb','/production')},
   {VERCEL_ENV:'production'},{CLARA_RECETTE_MODE:'isolated-v1'},
   {VERCEL_PROJECT_ID:'different-project'},{POSTGRES_URL:'postgresql://unexpected'},
 ]){
   assert.equal(validateMakeCloneRuntime({...env,...changed}),false);
 }
});
test('no credential resolution from an unauthenticated native context',async()=>{
 const store=scopedMakeReadCredentialStore('make-read-fixture-249-20261106','find-drive-document',undefined,env);
 await assert.rejects(
   ()=>store.get('make-read-fixture-249-20261106'),
   (e:unknown)=>e instanceof Error&&e.message==='NATIVE_MAKE_SCOPE_DENIED');
 await assert.rejects(
   ()=>store.set('make-read-fixture-249-20261106',{token:'fictional'}),
   (e:unknown)=>e instanceof Error&&e.message==='NATIVE_MAKE_PROVISIONING_DENIED');
});
test('no scope expansion, different key, or missing clone key',()=>{
 for(const [conn,scenario] of [
  ['other-connection','find-drive-document'],
  ['make-read-fixture-249-20261106','notify-team'],
  ['make-read-fixture-249-20261106','search-calendar-events'],
 ]){
  assert.throws(()=>scopedMakeReadCredentialStore(conn,scenario,undefined,env));
 }
 assert.throws(()=>scopedMakeReadCredentialStore('make-read-fixture-249-20261106','find-drive-document',undefined,{...env,CLARA_MAKE_CLONE_ENCRYPTION_KEY:undefined}));
});
