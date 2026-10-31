import test from 'node:test';
import {verifiedGoogleDisplayCookie} from '../lib/auth/google-display-name.ts';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,X509Certificate} from 'node:crypto';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable HTTPS fixture required');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
const cookie='clara_auth_session='+'A'.repeat(43);
const post=body=>fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('781 composition Cockpit: actual native mission, five languages and responsive navigation without provider activation',async t=>{
 const created=await post({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'});assert.equal(created.status,200);
 const sessionId=(await created.json()).data.sessionId,selection=created.headers.get('set-cookie').split(';')[0];
 const response=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:cookie+'; '+selection,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createMission',title:'HISTORICAL_AUTHORIZED_MISSION',objective:'Technical preparation with authorized evidence only'})});assert.equal(response.status,200);
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const display=verifiedGoogleDisplayCookie('A'.repeat(43),'Gildas',true);assert(display.value);
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  let context,page;const requests=[];
  for(const locale of ['fr','en','es','de','it']){
   for(const [device,width,height] of [['desktop',1536,1000],['tablet',820,1180],['mobile',390,844]]){
    if(context)await context.close();
    context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
    await context.addCookies([{name:display.name,value:display.value,httpOnly:true,secure:true,url:origin},{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:selection.slice(selection.indexOf('=')+1),url:origin},{name:'NEXT_LOCALE',value:locale,url:origin}]);
    page=await context.newPage();page.on('request',r=>requests.push({path:new URL(r.url()).pathname,method:r.method()}));
    await page.goto(origin);await page.locator('[data-cockpit-hero]').waitFor();
    await page.locator('[data-context-loading="false"]').waitFor();await page.locator('[data-native-business-context]').waitFor();
    const hero=page.locator('[data-cockpit-hero]');await hero.getByText('HISTORICAL_AUTHORIZED_MISSION',{exact:true}).filter({visible:true}).first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,locale+' '+device+' overflow');
    assert.equal(await hero.locator('img').count(),0);
    assert((await hero.innerText()).includes('Gildas'));
    if(locale==='fr')await hero.getByRole('heading',{name:'Bonjour Gildas.',exact:true}).filter({visible:true}).waitFor();
    assert.equal(await page.getByRole('log').count(),1);
    assert.equal(await page.locator('[data-cockpit-widgets] textarea').isVisible(),true);
    const body=await page.locator('body').innerText();assert(!body.includes('82 %'));assert(!body.includes('PRIVATE_LEGACY_HISTORY'));
    const voice=hero.locator('button');for(const button of await voice.all())if(await button.isVisible())assert.equal(await button.isDisabled(),true);
    const shortcuts=page.locator('[data-cockpit-widgets] nav').first();assert.equal(await shortcuts.locator('a').count(),6);assert.equal(await shortcuts.locator('button').count(),0);
    for(const href of ['/clara?intent=new-mission','/agenda','/missions','/conversations','/automatisations','/documents'])assert.equal(await shortcuts.locator('a[href="'+href+'"]').count(),1);
    if(process.env.COCKPIT_VISUAL_DIR){mkdirSync(process.env.COCKPIT_VISUAL_DIR,{recursive:true});await page.screenshot({animations:'disabled',path:join(process.env.COCKPIT_VISUAL_DIR,locale+'-'+device+'.png')});if(locale==='fr'){await hero.locator('button').filter({visible:true}).scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:join(process.env.COCKPIT_VISUAL_DIR,'fr-'+device+'-voice.png')});await page.locator('[data-cockpit-widgets]').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:join(process.env.COCKPIT_VISUAL_DIR,'fr-'+device+'-widgets.png')});}}
   }
  }
  assert(!requests.some(r=>/voice|elevenlabs|telephony/.test(r.path)));
  const forbidden=await fetch(origin+'/api/native/runtime?'+new URLSearchParams({workspaceId:'w',clientId:'c1',projectId:'p1',sessionId}),{headers:{cookie:'clara_auth_session='+'B'.repeat(43)}});assert.equal(forbidden.status,403);
  // Read-only navigation links must not produce a second mission.
  const count=()=>pg("SELECT count(*) FROM clara_missions");const before=count();
  const shortcuts=page.locator('[data-cockpit-widgets] nav').first();await shortcuts.locator('a[href="/conversations"]').click();await page.waitForURL(origin+'/conversations');
  await page.goto(origin);await page.locator('[data-cockpit-hero]').waitFor();await page.reload();await page.locator('[data-cockpit-hero]').getByText('HISTORICAL_AUTHORIZED_MISSION',{exact:true}).filter({visible:true}).first().waitFor();assert.equal(count(),before);
  const chat=page.locator('[data-cockpit-widgets] form').last();
  const query='CONSULTATION_CONTEXT_ONLY_NO_NEW_MISSION';
  await chat.locator('textarea').fill(query);
  const [reply]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST'),chat.locator('button[type="submit"]').click()]);assert.equal(reply.status(),200);
  await page.getByRole('log').getByText('Isolated Clara response',{exact:true}).waitFor();
  await page.reload();await page.getByRole('log').getByText(query,{exact:true}).waitFor();assert.equal(count(),before);
  assert.equal(await page.getByRole('log').getByText(query,{exact:true}).count(),1);
  if(process.env.COCKPIT_VISUAL_DIR){
   await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);
   for(const [device,width,height] of [['desktop',1536,1000],['tablet',820,1180],['mobile',390,844]]){
    await page.setViewportSize({width,height});await page.goto(origin);
    await page.getByRole('heading',{name:'Parler avec Clara',exact:true}).waitFor();
    await page.getByRole('log').getByText(query,{exact:true}).waitFor();
    await page.getByRole('log').scrollIntoViewIfNeeded();
    await page.screenshot({animations:'disabled',path:join(process.env.COCKPIT_VISUAL_DIR,'fr-'+device+'-conversation.png')});
   }
  }
  const digest=createHash('sha256').update('A'.repeat(43)).digest('hex');
  t.after(()=>pg(`UPDATE clara_auth_sessions SET revoked_at=NULL WHERE token_hash='${digest}'`));
  pg(`UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE token_hash='${digest}'`);
  await page.reload();await page.locator('[data-native-authority="locked"]').waitFor();assert.equal(await page.locator('[data-cockpit-hero]').count(),0);
  await context.clearCookies();await page.goto(origin);await page.locator('[data-native-authority="locked"]').waitFor();assert.equal(await page.locator('[data-cockpit-hero]').count(),0);
 }finally{await browser.close();}
});
