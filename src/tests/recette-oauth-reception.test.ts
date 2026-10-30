import test from 'node:test';
import assert from 'node:assert/strict';
import {neonConfig} from '@neondatabase/serverless';
import {attestRecetteOAuthReception,recetteOAuthOrigin} from '../lib/recette/oauth-reception-attestation';
const env:NodeJS.ProcessEnv={NODE_ENV:'production',VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret',CLARA_AUTH_APP_ORIGIN:recetteOAuthOrigin,CLARA_AUTH_GOOGLE_REDIRECT_URI:recetteOAuthOrigin+'/api/auth/google/callback'};
test('OAuth reception: actual injected configuration and pre-existing identity only, no provision or provider transport',async t=>{
 const previous=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=previous;});let calls=0,mode='ok';
 neonConfig.fetchFunction=async(_url,init)=>{
  calls++;assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');
  const batch=JSON.parse(String(init?.body));assert.equal(batch.queries.length,1);
  const query=batch.queries[0].query;assert.match(query,/^SELECT EXISTS/);assert.match(query,/m.revoked_at IS NULL/);assert.match(query,/i.issuer='https:\/\/accounts.google.com'/);
  assert(!/\b(INSERT INTO|UPDATE clara_|DELETE FROM|GRANT|CREATE|ALTER)\b/.test(query));
  if(mode==='network')throw Error(env.GOOGLE_CLIENT_SECRET);
  return Response.json({results:[{fields:[{name:'enrolled_google_member',dataTypeID:16},{name:'sign_in_permissions',dataTypeID:16}],rows:[[mode==='no-identity'?'f':'t',mode==='permissions'?'f':'t']]}]});
 };
 await t.test('wrong target/database, Production and mismatching OAuth origin fail before SQL',async()=>{
  for(const change of [{VERCEL_ENV:'production'},{CLARA_RECETTE_NEON_BRANCH_ID:'main'},{POSTGRES_URL:''},{CLARA_AUTH_APP_ORIGIN:'https://os.melodie.digital'},{CLARA_AUTH_GOOGLE_REDIRECT_URI:'https://os.melodie.digital/api/auth/google/callback'},{CLARA_AUTH_APP_ORIGIN:recetteOAuthOrigin+'/?unsafe=1'}])assert.equal(await attestRecetteOAuthReception({...env,...change}),'FAIL');
  assert.equal(calls,0);
 });
 await t.test('missing client reference or secret is not attested and never falls back',async()=>{
  for(const key of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'])assert.equal(await attestRecetteOAuthReception({...env,[key]:''}),'NON ATTESTÉ');assert.equal(calls,0);
 });
 await t.test('positive membership, absent/revoked membership and missing permissions are distinguished without identifiers',async()=>{
  assert.equal(await attestRecetteOAuthReception(env),'PASS');
  assert.equal(await attestRecetteOAuthReception({...env,CLARA_AUTH_APP_ORIGIN:recetteOAuthOrigin+'/'}),'PASS');
  mode='no-identity';assert.equal(await attestRecetteOAuthReception(env),'FAIL');
  mode='permissions';assert.equal(await attestRecetteOAuthReception(env),'FAIL');
  mode='network';assert.equal(await attestRecetteOAuthReception(env),'NON ATTESTÉ');
 });
});
