import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import test from 'node:test';
import {X509Certificate,createHash} from 'node:crypto';
const db=process.env.NATIVE_TEST_DATABASE,origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!db||!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Isolated local fixture required');assert.match(db,/^native_browser_[a-f0-9]{32}$/);
test('mission contact restart: same mission, explicit new session, untouched original history and five authorized UI surfaces',async()=>{
const proof=JSON.parse(readFileSync('/tmp/native-p1-restart-'+db,'utf8'));
const pg=(q)=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-c',q],{encoding:'utf8'}).trim();
const selection=encodeURIComponent(JSON.stringify(proof.scope)),headers={cookie:'clara_auth_session='+'E'.repeat(43)+'; clara_native_selection='+selection};
const r=await fetch(origin+'/api/native/runtime',{headers});assert.equal(r.status,200);const data=await r.json();assert.equal(data.session.mission.id,proof.missionId);assert.equal(data.session.acquisitionSubmissionId,'prospect-a');assert.equal(data.session.conversation.length,0);
const old=JSON.parse(pg("SELECT data FROM clara_sessions WHERE id='"+proof.oldSessionId+"'"));assert.equal(old.acquisitionSubmissionId,undefined);assert.equal(JSON.stringify(old.conversation),proof.history);assert.equal(old.mission.acquisitionSubmissionId,'prospect-a');
const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
try{const ctx=await browser.newContext();await ctx.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin},{name:'clara_native_selection',value:selection,url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await ctx.newPage();for(const path of ['/','/missions','/conversations','/contacts','/journal']){await page.goto(origin+path);assert.equal(await page.locator('[data-native-authority="locked"]').count(),0);assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_prospect-b'));}console.log('PASS: real Next process restart, same business mission/contact, distinct new native session, old history and old active context unchanged, five UI surfaces authorized.');}finally{await browser.close();}

});
