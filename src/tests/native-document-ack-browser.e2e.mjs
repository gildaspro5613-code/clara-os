import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {X509Certificate,createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE,out=process.env.DOCUMENT_CONTINUITY_EVIDENCE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??'')||!out?.startsWith('/workspace/'))throw Error('Isolated acknowledgement test required');
test('document UI: actual commit then lost acknowledgement, refresh and explicit replay preserve one analysis and Journal event',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 const count=()=>Number(execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-At','-c',"SELECT count(*) FROM clara_journal_entries WHERE entry->>'summary'='DOCUMENT_RECEIVED'"],{encoding:'utf8'}).trim());
 try{const context=await browser.newContext();await context.addCookies(JSON.parse(readFileSync(out+'/synthetic-cookie-jar.json','utf8')));await context.route('**/*',r=>{const h=r.request().headers();return new URL(r.request().url()).origin===new URL(origin).origin&&!h['next-router-prefetch']&&h.purpose!=='prefetch'?r.continue():r.abort();});
 const page=await context.newPage();await page.goto(origin+'/documents');await page.locator('[data-document-analysis="structured"]').first().waitFor();
 let operation,signal;const committed=new Promise(r=>signal=r),before=count();
 await page.route('**/api/documents',async route=>{const request=route.request();if(request.method()==='POST'&&request.postDataJSON().action==='read'&&!operation){operation=request.postDataJSON();const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');signal();}else await route.continue();});
 const button=()=>page.locator('[data-native-document="document-a"] button');await button().click();await committed;await page.waitForFunction(()=>!document.querySelector('[data-native-document="document-a"] button')?.disabled);
 const stored=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('clara.document.pending:')).map(k=>({key:k,...JSON.parse(sessionStorage.getItem(k))})));assert.equal(stored.length,1);assert.equal(stored[0].operationId,operation.operationId);assert.equal(count(),before+1);
 const proofPath='/tmp/native-fixture-document-prompts-'+db,calls=readFileSync(proofPath,'utf8').split('\n').filter(Boolean).length;
 await page.reload();await page.locator('[data-document-analysis="structured"]').first().waitFor();
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/documents')&&r.request().method()==='POST'&&r.request().postDataJSON().operationId===operation.operationId);
 await button().click();const response=await responsePromise;assert.equal(response.status(),200);assert.equal((await response.json()).replayed,true);await page.waitForFunction(()=>Object.keys(sessionStorage).every(k=>!k.startsWith('clara.document.pending:')));
 assert.equal(count(),before+1);assert.equal(readFileSync(proofPath,'utf8').split('\n').filter(Boolean).length,calls);
 writeFileSync(out+'/ack-loss-result.json',JSON.stringify({status:'PASS',actualCommitBeforeAbort:true,operationIdentityRetainedAcrossRefresh:true,receiptReplayed:true,oneJournalEvent:true,noSecondProviderAnalysis:true},null,2));await context.close();}finally{await browser.close();}
});
