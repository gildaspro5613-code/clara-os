import test from 'node:test';import assert from 'node:assert/strict';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {assertHeroFlow} from './helpers/historical-hero-layout.mjs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable local fixture required');
test('historical Hero: two persisted authorized missions, no overlapping panels, five locales and three viewports',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 const out='/tmp/historical-hero-final';mkdirSync(out,{recursive:true});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin}]);
  const command=async data=>{const r=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data});assert.equal(r.status(),200);return r.json();};
  for(const title of ['Réception synthétique — préparation lumière','Réception synthétique — coordination technique']){
   await command({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'});
   await command({action:'createMission',title,objective:'Données fictives pour la réception visuelle sans fournisseur réel'});
  }
  const scope=await(await context.request.get(origin+'/api/native/runtime')).json();assert.equal(scope.missions.length,2);
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();const rows=[];
  for(const locale of ['fr','en','es','de','it'])for(const [device,width,height]of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]]){
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);await page.setViewportSize({width,height});
   const panelResponses=Promise.all(['/api/calendar','/api/native/mail','/api/weather'].map(path=>page.waitForResponse(r=>new URL(r.url()).pathname===path)));
   const response=await page.goto(origin+'/');assert.equal(response.status(),200);assert.equal(await page.locator('html').getAttribute('lang'),locale);
   assert.equal(await page.locator('#main-workspace .native-context').count(),0);assert.equal(await page.locator('#native-account-menu').evaluate(e=>e.open),false);
   assert.ok(await page.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await Promise.all((await panelResponses).map(r=>r.finished()));
   const copy=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8'));
   await page.locator('[data-cockpit-hero]').getByText(copy.common.loading,{exact:true}).waitFor({state:'hidden'});
   await page.getByText(copy.cockpitUi.agendaLoading,{exact:true}).first().waitFor({state:'hidden'});
   await assertHeroFlow(page);
   for(const m of scope.missions)await page.locator('[data-cockpit-hero]').getByRole('link',{name:m.title,exact:true}).waitFor();
   await page.screenshot({path:`${out}/cockpit-${locale}-${device}.png`});rows.push({locale,device,status:'PASS',scope:'two synthetic missions in explicitly selected authorized project; no provider certification'});
  }
  await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);await page.goto(origin+'/');
  const viewed=scope.missions.find(m=>m.title.includes('lumière'));assert.ok(viewed);
  await page.locator('[data-cockpit-hero]').getByRole('link',{name:viewed.title,exact:true}).click();await page.waitForURL(url=>url.pathname==='/missions'&&url.searchParams.get('mission')===viewed.id);
  await page.getByRole('heading',{name:viewed.title,exact:true}).waitFor();
  assert.equal((await(await context.request.get(origin+'/api/native/runtime')).json()).session.mission.id,scope.session.mission.id,'Opening a mission detail must not reassign the active conversation');
  const labels=JSON.parse(readFileSync('src/i18n/messages/fr/missions.json','utf8'));
  await page.getByRole('button',{name:labels.back,exact:true}).click();await page.waitForURL(origin+'/missions');await page.reload();assert.equal(new URL(page.url()).search,'');
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  writeFileSync(out+'/matrix.json',JSON.stringify({providerCertified:false,rows},null,2)+'\n');
 }finally{await browser.close();}
});
