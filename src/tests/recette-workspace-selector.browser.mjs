import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

// Real compiled Next/React selector, browser API responses controlled; no real DB.
test('workspace selector: loading, 401, empty, server/network failures and authorized options survive reload',async t=>{
 const port=3086,origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,NODE_ENV:'production',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',VERCEL_URL:'recette-test.vercel.app',CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-isolated-test.eu-central-1.aws.neon.tech',DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-isolated-test.eu-central-1.aws.neon.tech/neondb?sslmode=require'}});
 let logs='';child.stdout.on('data',b=>{logs+=b;});child.stderr.on('data',b=>{logs+=b;});
 t.after(()=>child.kill('SIGTERM'));
 let up=false;for(let i=0;i<80;i++){try{const r=await fetch(origin+'/recette',{signal:AbortSignal.timeout(1000)});if(r.status===200){up=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(up,'compiled server ready');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});t.after(()=>browser.close());
 const context=await browser.newContext({locale:'fr-FR'});
 await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);
 let state='hold',release;let registryCalls=0,foreignRequests=0;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==origin){foreignRequests++;await route.abort();return;}
  if(!u.pathname.startsWith('/api/')){await route.continue();return;}
  if(u.pathname==='/api/canonical/registry'){
   registryCalls++;
   if(state==='hold')await new Promise(resolve=>{release=resolve;});
   if(state==='network'){await route.abort();return;}
   const status=state==='unauthenticated'?401:state==='error'?503:200;
   const data=state==='ready'?[{workspace_id:'recette-fictional-workspace'}]:[];
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data})});return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:false,authenticated:false,connected:false})});
 });
 const page=await context.newPage();
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 const select=page.getByRole('region',{name:'Contexte canonique privé',exact:true}).locator('select').first();
 await page.getByText('Chargement des espaces autorisés…',{exact:true}).waitFor();assert.equal(await select.isDisabled(),true);
 for(let i=0;i<40&&!release;i++)await new Promise(r=>setTimeout(r,50));assert.ok(release);
 state='unauthenticated';release();
 await page.getByRole('link',{name:'Connexion de recette'}).waitFor();assert.equal(await select.isDisabled(),true);
 assert.equal(await page.getByRole('link',{name:'Connexion de recette'}).getAttribute('href'),'/recette');
 state='empty';await page.reload();await page.getByText('Aucun espace autorisé pour cette session.',{exact:false}).waitFor();assert.equal(await select.isDisabled(),true);
 state='error';await page.reload();await page.getByText('Impossible de charger les espaces autorisés.',{exact:false}).waitFor();assert.equal(await select.isDisabled(),true);
 state='network';await page.reload();await page.getByText('Impossible de charger les espaces autorisés.',{exact:false}).waitFor();assert.equal(await select.isDisabled(),true);
 state='ready';await page.reload();await select.locator('option').filter({hasText:'recette-fictional-workspace'}).waitFor({state:'attached'});assert.equal(await select.isDisabled(),false);
 await page.reload();await select.locator('option').filter({hasText:'recette-fictional-workspace'}).waitFor({state:'attached'});
 assert.ok(registryCalls>=6);assert.equal(foreignRequests,0);assert.ok(logs.includes('instrumentation ready'));
 await context.close();
});
