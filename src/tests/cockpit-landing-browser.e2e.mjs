import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Existing disposable native browser fixture required');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
const digest=value=>createHash('sha256').update(value).digest('hex');
test('authenticated workspace-only Cockpit: historical shell, no business traffic; empty list, errors and revoked access distinguished',async()=>{
 pg("INSERT INTO clara_auth_users(id) VALUES('welcome-member');INSERT INTO clara_auth_workspaces(id) VALUES('welcome-empty');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','welcome-member','welcome-member');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('welcome-member','welcome-empty','member');");
 pg(`INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${digest('F'.repeat(43))}','welcome-member',NOW()+INTERVAL '1 hour');INSERT INTO clara_auth_sessions(token_hash,user_id,created_at,expires_at) VALUES('${digest('G'.repeat(43))}','welcome-member',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at,revoked_at) VALUES('${digest('H'.repeat(43))}','welcome-member',NOW()+INTERVAL '1 hour',NOW());`);
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true});await context.addCookies([{name:'clara_auth_session',value:'F'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  const page=await context.newPage(),requests=[];
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(new URL(r.url()).pathname);});
  await page.goto(origin);await page.locator('[data-cockpit-state="no-project"]').waitFor();
  assert.equal(await page.getByRole('heading',{name:'Aucun projet sélectionné',exact:true}).count(),1);
  assert.equal(await page.locator('[data-cockpit-hero]').count(),1);assert.equal(await page.locator('[data-cockpit-state="no-project"] button, [data-cockpit-state="no-project"] input').count(),0);
  assert(!(await page.locator('body').innerText()).includes('PRIVATE_LEGACY_HISTORY'));
  await page.locator('#native-account-menu > summary').click();
  await page.getByRole('region',{name:'Contexte canonique privé',exact:true}).locator('select').nth(0).selectOption('welcome-empty');
  await page.getByRole('status').filter({hasText:'Aucun client autorisé dans cet espace.'}).waitFor();
  for(const [status,text] of [[401,'Connectez-vous'],[403,'Accès à cet espace refusé.'],[503,'Le contexte est temporairement indisponible.']]){
   await page.route('**/api/canonical/registry',async route=>{
    if(route.request().method()==='POST')return route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:false,data:[]})});
    return route.continue();
   });
   const workspace=page.getByRole('region',{name:'Contexte canonique privé',exact:true}).locator('select').nth(0);await workspace.selectOption('');await workspace.selectOption('welcome-empty');
   if(status===401)await page.getByRole('alert').waitFor();else await page.getByRole('alert').filter({hasText:text}).waitFor();
   assert.equal(await page.getByRole('status').filter({hasText:'Aucun client autorisé'}).count(),0);await page.unroute('**/api/canonical/registry');
  }
  assert(requests.every(path=>path==='/api/canonical/registry'));
  for(const locale of ['fr','en','es','de','it']){
   const translations=JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'));
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);await page.goto(origin);
   await page.getByRole('heading',{name:translations.cockpitNoProjectSelected,exact:true}).waitFor();
   assert.equal(await page.locator('[data-cockpit-state="no-project"] button, [data-cockpit-state="no-project"] input').count(),0);
  }
  assert(requests.every(path=>path==='/api/canonical/registry'));
  await page.reload();await page.locator('[data-cockpit-state="no-project"]').waitFor();
  await context.addCookies([{name:'clara_native_selection',value:'malformed',url:origin}]);await page.reload();await page.locator('[data-native-authority="locked"]').waitFor();assert.equal(await page.locator('[data-cockpit-state="no-project"]').count(),0);
  for(const token of ['','G'.repeat(43),'H'.repeat(43)]){
   await context.clearCookies();if(token)await context.addCookies([{name:'clara_auth_session',value:token,url:origin}]);await page.goto(origin);await page.locator('[data-native-authority="locked"]').waitFor();
  }
  pg("UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='welcome-member'");
  await context.clearCookies();await context.addCookies([{name:'clara_auth_session',value:'F'.repeat(43),url:origin}]);await page.goto(origin);await page.locator('[data-native-authority="locked"]').waitFor();
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
 }finally{await browser.close();}
});
