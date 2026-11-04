import {splitMailSignature} from '../components/native/mail-signature-presentation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {nativeMailRouteFixture} from './helpers/native-mail-route-fixture.ts';
import {seedNativeMailFixture,SimulatedMail} from './helpers/native-mail-fixture.ts';
import {OpenAIResponsesEngine} from '../lib/connectors/internal/openai/responses/openai-responses-engine.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated local fixture required');
test('Messagerie visual receipt: real route, encrypted PostgreSQL draft, simulated IMAP and drafting; no sending',async t=>{
 const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'});if(pg('SELECT COUNT(*) FROM clara_native_mail_authority').trim()==='0')seedNativeMailFixture(pg);
 const query=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){console.info('ISOLATED_SQLSTATE',String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'unknown');throw {code:String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 process.env.CLARA_AUTH_APP_ORIGIN=origin;process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const provider=new SimulatedMail();provider.content={...provider.content,subject:'Préparation du rendez-vous',text:'Bonjour,\n\nPeux-tu me confirmer les éléments à préparer pour notre rendez-vous ?\n\nMerci et à bientôt.'};const foreign=new SimulatedMail(),handlers=nativeMailRouteFixture(query,c=>c.address==='clara@melodie.digital'?provider:foreign);
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>({success:true,content:JSON.stringify({language:'fr',subject:'Re: Préparation du rendez-vous',body:'Bonjour,\n\nMerci pour ton message. Je te propose de reprendre ensemble les éléments du rendez-vous et les prochaines étapes.\n\nÀ bientôt,'}),responseStatus:'completed'}));
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const before=process.env.MAIL_VISUAL_BEFORE==='1';
  const directory='docs/mail-visual-finalization-20261104/captures';mkdirSync(directory,{recursive:true});
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  await context.route('**/api/native/mail**',async route=>{const r=route.request(),request=new Request(r.url(),{method:r.method(),headers:await r.allHeaders(),...(r.method()==='POST'?{body:r.postData()}:{} )});const response=await handlers[r.method()](request);if(response.status>=400)console.info('ISOLATED_MAIL_REFUSAL',response.status,(await response.clone().json()).code);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  const created=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(created.status(),200);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/messagerie');
  // Desktop search keeps its existing header input; the results panel must not
  // duplicate it. The mobile dialog retains its own single responsive input.
  await page.locator('header input[type="search"]').click();
  await page.locator('[data-header-search]').waitFor({state:'visible'});
  assert.equal(await page.locator('input[type="search"]:visible').count(),1);
  await page.keyboard.press('Escape');
  await page.getByLabel('Boîte email',{exact:true}).selectOption('mail-clara');
  const sync=page.locator('.mail-sync-settings > summary');if(await sync.count())await sync.click();
  await page.getByRole('button',{name:'Dossiers autorisés',exact:true}).click();await page.getByLabel('Dossier',{exact:true}).selectOption('INBOX');await page.getByRole('button',{name:'Synchroniser',exact:true}).click();
  await page.getByRole('button',{name:/correspondent@example.invalid/}).click();const prepared=page.waitForResponse(r=>r.url().includes('/api/native/mail')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='prepare');await page.getByRole('button',{name:'Préparer une réponse avec Clara',exact:true}).click();assert.equal((await prepared).status(),200);await page.getByLabel('Réponse',{exact:true}).waitFor();
  const original=(await page.evaluate(async()=>await (await fetch('/api/native/mail?action=draft&connectionId=mail-clara')).json())).draft.body;
  // Same save action, exact original body preserved through the UI projection.
  await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('section[aria-busy="true"]'));
  const saved=(await page.evaluate(async()=>await (await fetch('/api/native/mail?action=draft&connectionId=mail-clara')).json())).draft.body;assert.equal(saved,original);
  const metrics=[];
  for(const locale of ['fr','en','es','de','it']){
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
   for(const [format,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]){
    await page.setViewportSize({width,height});await page.reload();
    const account=page.locator('section.native-panel select[aria-label]').first();await account.selectOption('mail-clara');
    // Use translated existing labels from the rendered dictionary.
    // The refresh button is the first button in the mailbox toolbar.
    await account.locator('xpath=../..').getByRole('button').click();
    const reply=page.locator('textarea').first();await reply.waitFor();
    if(!before){
     assert.equal(await reply.inputValue(),splitMailSignature(original).message);
     assert.ok(!(await page.locator('section.native-panel').innerText()).includes('-- End Mélodie Digital signature --'));
     assert.equal(await page.locator('section.native-panel details[open]').count(),0);
     const rect=await reply.boundingBox(),form=await reply.locator('xpath=ancestor::form').boundingBox();
     assert.ok(rect.width>form.width*.8);assert.ok(rect.height>=320);
     assert.equal(await reply.evaluate(el=>getComputedStyle(el).scrollbarWidth),'thin');
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    metrics.push({locale,format,reply:await reply.boundingBox()});
    await page.screenshot({path:directory+'/'+(before?'before':'after')+'-'+locale+'-'+format+'.png',fullPage:true});
    if(!before){await reply.scrollIntoViewIfNeeded();await page.screenshot({path:directory+'/after-composer-'+locale+'-'+format+'.png',fullPage:true});}
    if(!before&&locale==='fr'){await page.getByRole('button',{name:/correspondent@example.invalid/}).first().click();await page.locator('.mail-reader').waitFor();await page.screenshot({path:directory+'/after-reading-fr-'+format+'.png',fullPage:true});}
   }
  }
  assert.deepEqual(errors,[]);assert.equal(provider.sent.length,0);assert.equal(foreign.sent.length,0);
  assert.equal((await handlers.GET(new Request(origin+'/api/native/mail'))).status,401);
  writeFileSync(directory+'/'+(before?'before':'after')+'-metrics.json',JSON.stringify(metrics,null,2));
 }finally{await browser.close();}
});
