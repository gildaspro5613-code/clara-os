import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createHash,X509Certificate} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,out=process.env.DOCUMENT_CONTINUITY_EVIDENCE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??'')||!out?.startsWith('/workspace/'))throw Error('Isolated provider-surface fixture required');
test('real browser: disabled telephony cannot launch on Enter; native Make/Brevo fences and anonymous voice denials remain effective',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const selected=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(selected.status(),200);
  const page=await context.newPage();let callPosts=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/telephony'&&r.method()==='POST')callPosts++;});
  await page.goto(origin+'/telephonie');await page.locator('input[type=tel]').fill('+33000000000');await page.locator('input[type=tel]').press('Enter');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(callPosts,0);assert.ok(await page.getByRole('button',{name:'Appeler',exact:true}).isDisabled());
  for(const path of ['/api/connections/make/status','/api/connections/brevo']){const r=await context.request.get(origin+path);assert.equal(r.status(),503);assert.equal((await r.json()).code,'NATIVE_SCOPED_OPERATION_UNAVAILABLE');}
  for(const path of ['/api/elevenlabs/session']){const r=await fetch(origin+path);assert.equal(r.status,403);}
  await page.goto(origin+'/');assert.equal(await page.locator('[data-native-authority="locked"]').count(),0);await page.getByText('Résumé de la mission active',{exact:true}).waitFor();
  writeFileSync(out+'/provider-surface-result.json',JSON.stringify({status:'PASS',telephonyButtonDisabled:true,keyboardPostCount:callPosts,nativeMakeBrevoFenced:true,anonymousVoiceDenied:true,cockpit:true,realProviderCalls:0},null,2));
 }finally{await browser.close();}
});
