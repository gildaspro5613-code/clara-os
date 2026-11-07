import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NextIntlClientProvider} from 'next-intl';
import {readFileSync} from 'node:fs';
import {GOOGLE_DISPLAY_COOKIE,googleGivenName,verifiedGoogleDisplayCookie,readGoogleDisplayName} from '../lib/auth/google-display-name';
import {sessionTokenDigest} from '../lib/auth/authenticated-workspace-session';
import Brief from '../components/cockpit/panels/BriefPanel';
import {createSession} from '../lib/core/session';
test('Google display metadata is encrypted, bounded and bound to one authenticated session; never an authority',t=>{
 const prior=process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');t.after(()=>{if(prior===undefined)delete process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;else process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=prior;});
 const token='A'.repeat(43),digest=sessionTokenDigest(token)!,now=1000,cookie=verifiedGoogleDisplayCookie(token,'Gildas',true,now),header=GOOGLE_DISPLAY_COOKIE+'='+cookie.value;
 assert.equal(cookie.options.httpOnly,true);assert.equal(cookie.options.secure,true);assert.equal(cookie.options.sameSite,'lax');assert(!cookie.value.includes('Gildas'));assert(!cookie.value.includes(token));
 assert.equal(readGoogleDisplayName(header,digest,now),'Gildas');
 assert.equal(readGoogleDisplayName(header,sessionTokenDigest('B'.repeat(43))!,now),null);
 assert.equal(readGoogleDisplayName(header,digest,now+12*60*60*1000),null);
 assert.equal(readGoogleDisplayName(header,digest,now-1),null);
 assert.equal(readGoogleDisplayName(header+'; '+header,digest,now),null);
 assert.equal(readGoogleDisplayName(header.slice(0,-10)+'forged',digest,now),null);
 assert.equal(readGoogleDisplayName(null,digest,now),null);
 for(const name of ['','Gildas\nOwner','<script>','a'.repeat(81),null])assert.equal(googleGivenName(name),null);
 delete process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;assert.equal(verifiedGoogleDisplayCookie(token,'Gildas',true,now).options.maxAge,0);assert.equal(readGoogleDisplayName(header,digest,now),null);
});
test('Brief uses verified display identity only, never old session or environment fallback',()=>{
 const messages=JSON.parse(readFileSync('src/i18n/messages/fr/index.json','utf8'));messages.ui={...messages.ui,...JSON.parse(readFileSync('src/i18n/messages/fr/consolidated-ui.json','utf8'))};
 const session=createSession();session.user.firstName='LEGACY_UNTRUSTED_NAME';
 const render=(displayFirstName:string|null)=>renderToStaticMarkup(createElement(NextIntlClientProvider,{locale:'fr',timeZone:'Europe/Paris',messages},createElement(Brief,{session,displayFirstName})));
 assert(render('Gildas').includes('Bonjour Gildas.'));assert(!render(null).includes('LEGACY_UNTRUSTED_NAME'));assert(!render(null).includes('Bonjour Gildas'));
});

test('actual callback attaches display only to a completed Google sign-in, clears it on failure',async t=>{
 const {createRequire}=await import('node:module'),{resolve}=await import('node:path'),vm=await import('node:vm'),ts=await import('typescript'),{NextRequest}=await import('next/server');
 const prior={origin:process.env.CLARA_AUTH_APP_ORIGIN,key:process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY,node:process.env.NODE_ENV};
 Object.assign(process.env,{CLARA_AUTH_APP_ORIGIN:'https://fixture.invalid',CLARA_CREDENTIALS_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64'),NODE_ENV:'production'});
 t.after(()=>{for(const [k,v] of [['CLARA_AUTH_APP_ORIGIN',prior.origin],['CLARA_CREDENTIALS_ENCRYPTION_KEY',prior.key],['NODE_ENV',prior.node]]){if(v===undefined)delete process.env[k!];else process.env[k!]=v;}});
 const file='src/app/api/auth/google/callback/route.ts',require=createRequire(resolve(file)),exports:Record<string,unknown>={};let allowed=true;
 const display=await import('../lib/auth/google-display-name'),lifecycle=await import('../lib/auth/authenticated-session-lifecycle');
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,process,console:{error:()=>{}},require:(name:string)=>({
  '@/lib/auth/google-display-name':display,'@/lib/auth/authenticated-session-lifecycle':lifecycle,
  '@/lib/auth/google-sign-in':{completeGoogleSignIn:async(_code:string,_state:string,_nonce:string,verifiedName:(name:string)=>void)=>{if(!allowed)throw Error('UNVERIFIED');verifiedName('Gildas');return 'A'.repeat(43);}},
  '@/lib/auth/sign-in-transaction':{isOpaqueAuthValue:(v:string)=>/^[A-Za-z0-9_-]{43,128}$/.test(v)},
 } as Record<string,unknown>)[name]??require(name)});
 const get=exports.GET as(r:InstanceType<typeof NextRequest>)=>Promise<import('next/server').NextResponse>;
 const request=()=>new NextRequest('https://fixture.invalid/api/auth/google/callback?state='+'S'.repeat(43)+'&code=synthetic',{headers:{cookie:'clara_auth_google_nonce='+'N'.repeat(43)}});
 const response=await get(request()),proof=response.cookies.get(GOOGLE_DISPLAY_COOKIE)!;
 assert.equal(readGoogleDisplayName(proof.name+'='+proof.value,sessionTokenDigest('A'.repeat(43))!),'Gildas');
 assert(response.headers.get('set-cookie')!.includes('HttpOnly'));assert(response.headers.get('set-cookie')!.includes('Secure'));
 allowed=false;const denied=await get(request());assert.equal(denied.cookies.get(GOOGLE_DISPLAY_COOKIE)?.value,'');assert.equal(denied.cookies.get('clara_auth_session'),undefined);
});
