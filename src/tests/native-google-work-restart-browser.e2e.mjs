import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated restarted runtime only');
test('new server process and browser recover persisted Google receipts without another handoff',async()=>{
 const proof=JSON.parse(readFileSync('/tmp/native-google-restart-'+db,'utf8'));
 const state=()=>JSON.parse(readFileSync('/tmp/native-fixture-google-state-'+db,'utf8'));
 assert.equal(state().workspace.writes.length,proof.writes);
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext({timezoneId:'Europe/Paris'});await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin},{name:'clara_native_selection',value:proof.selection,url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin+'/documents');const panel=page.getByRole('region',{name:'Drive : importation et écritures confirmées',exact:true});await panel.getByRole('button',{name:'Relire la proposition enregistrée',exact:true}).first().waitFor();
  const result=await page.evaluate(async p=>{const r=await fetch('/api/native/google/work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'execute',connectionId:'google-work-a',operationId:p.operationId,reviewHash:p.reviewHash,confirm:true})});return {status:r.status,body:await r.json()};},proof);
  assert.equal(result.status,200);assert.equal(result.body.status,'completed');
  assert.equal(state().workspace.writes.length,proof.writes);
  await page.getByRole('article').filter({has:page.getByText('brief-final.txt',{exact:true})}).getByRole('link',{name:/Télécharger/}).waitFor();
  await page.goto(origin+'/');assert.ok((await page.locator('body').innerText()).includes('GOOGLE_WORK_RECEPTION'));await page.getByText('GOOGLE_UPDATED_APPOINTMENT',{exact:true}).first().waitFor();
  await context.close();
 }finally{await browser.close();}
});
