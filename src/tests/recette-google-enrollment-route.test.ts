import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {neonConfig} from '@neondatabase/serverless';
import {POST} from '../app/api/auth/google/enroll/route';
import {enrollmentOrigin,enrollmentDatabase} from '../lib/auth/recette-google-enrollment';

test('administrative entry: same-origin POST, private ticket, secure cookies and ordinary OAuth transaction',async t=>{
 const previous={...process.env},oldFetch=neonConfig.fetchFunction;
 t.after(()=>{neonConfig.fetchFunction=oldFetch;for(const k of Object.keys(process.env))if(!(k in previous))delete process.env[k];Object.assign(process.env,previous);});
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',CLARA_AUTH_APP_ORIGIN:enrollmentOrigin,CLARA_AUTH_GOOGLE_REDIRECT_URI:enrollmentOrigin+'/api/auth/google/callback',GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret'});delete process.env.POSTGRES_URL;
 let calls=0,valid=true;
 neonConfig.fetchFunction=async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));
  if(body.queries){assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');return Response.json({results:[{fields:[{name:'valid',dataTypeID:16}],rows:[[valid?'t':'f']]}]});}
  assert.match(body.query,/INSERT INTO clara_auth_sign_in_transactions/);assert.equal(body.params[1],'google');
  return Response.json({fields:[],rows:[]});
 };
 const ticket='t'.repeat(43);
 const request=(origin:string|null=enrollmentOrigin,body='ticket='+ticket,url=enrollmentOrigin)=>new NextRequest(url+'/api/auth/google/enroll',{method:'POST',headers:{...(origin?{origin}:{}),'content-type':'application/x-www-form-urlencoded'},body});
 for(const r of [request(null),request('https://foreign.invalid'),request(enrollmentOrigin,'ticket=bad'),request(enrollmentOrigin,'ticket='+ticket+'&ticket='+ticket),request(enrollmentOrigin,'ticket='+ticket,'https://os.melodie.digital')])assert.equal((await POST(r)).status,403);
 assert.equal(calls,0);
 valid=false;assert.equal((await POST(request())).status,403);assert.equal(calls,1);
 valid=true;const response=await POST(request());assert.equal(response.status,303);assert.equal(calls,3);
 const location=new URL(response.headers.get('location')!);assert.equal(location.origin,'https://accounts.google.com');assert.equal(location.searchParams.get('scope'),'openid profile email');assert.equal(location.searchParams.get('redirect_uri'),enrollmentOrigin+'/api/auth/google/callback');assert(!location.href.includes(ticket));
 const cookies=response.headers.get('set-cookie')!;assert.match(cookies,/HttpOnly/);assert.match(cookies,/Secure/);assert.match(cookies,/SameSite=lax/);assert.match(cookies,/Path=\/api\/auth\/google\/callback/);assert.equal(response.headers.get('cache-control'),'no-store');
 process.env.VERCEL_ENV='production';assert.throws(()=>enrollmentDatabase(),/REFUSED/);const before=calls;assert.equal((await POST(request())).status,403);assert.equal(calls,before);
});
