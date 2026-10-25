import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Isolated server required');
test('native browser: explicit selection, positive persisted mission/chat and cross-user/project refusals',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
 const anonymous=await browser.newContext();await anonymous.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);const anonymousPage=await anonymous.newPage();await anonymousPage.goto(origin+'/missions');await anonymousPage.getByRole('link',{name:'Connectez-vous pour consulter les projets autorisés.',exact:true}).waitFor();assert.equal(await anonymousPage.locator('a[href="/api/auth/google/start"]').count(),1);assert.equal(await anonymousPage.locator('[data-native-authority="locked"]').count(),1);await anonymous.close();
 const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
 const page=await context.newPage();await page.goto(origin+'/clara');
 const panel=page.getByRole('region',{name:'Contexte canonique privé',exact:true});
 await panel.locator('select').nth(0).selectOption('w');await panel.locator('select').nth(1).selectOption('c1');await panel.locator('select').nth(2).selectOption('p1');
 await panel.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click();await page.getByLabel('Titre de la mission',{exact:true}).waitFor();
 await page.getByLabel('Titre de la mission',{exact:true}).fill('PRIVATE_NATIVE_A_P1');await page.getByLabel('Objectif de la mission',{exact:true}).fill('PRIVATE_OBJECTIVE_A');
 await page.getByRole('button',{name:'Créer la mission',exact:true}).click();await page.getByText('PRIVATE_NATIVE_A_P1',{exact:true}).first().waitFor();
 const cookies=await context.cookies(),selection=cookies.find(c=>c.name==='clara_native_selection');assert.ok(selection);const scope=JSON.parse(decodeURIComponent(selection.value));assert.equal(scope.projectId,'p1');
 for(const locale of ['fr','en','es','de','it']){await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);for(const path of ['/','/clara','/missions','/journal','/conversations','/brain']){
  const response=await page.goto(origin+path);assert.equal(response.status(),200,locale+" "+path);assert.equal(await page.locator('[data-native-authority="locked"]').count(),0,path);assert.ok(!(await response.text()).includes('PRIVATE_LEGACY_HISTORY'));assert.equal(await page.locator('html').getAttribute('lang'),locale);
 }}
 const headerCookie=cookies.map(c=>c.name+'='+c.value).join(';');
 const response=await fetch(origin+'/api/clara/chat',{method:'POST',headers:{cookie:headerCookie,origin,'Content-Type':'application/json'},body:JSON.stringify({operationId:crypto.randomUUID(),message:'NATIVE_CHAT_A'})});assert.equal(response.status,200,await response.clone().text());
 await page.goto(origin+'/conversations');await page.getByText('NATIVE_CHAT_A',{exact:true}).waitFor();await page.getByText('Isolated Clara response',{exact:true}).waitFor();
 const current=await (await fetch(origin+'/api/clara/session?'+new URLSearchParams(scope),{headers:{cookie:headerCookie}})).json();
 const manual=current.mission.tasks.find(task=>!task.execution);assert.ok(manual,'The real Brain fallback exposes a non-executable manual task in this fixture.');
 for(const completed of [true,false]){
  const changed=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:headerCookie,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'toggleTask',missionId:current.mission.id,taskId:manual.id,completed})});assert.equal(changed.status,200,await changed.clone().text());
  const persisted=await (await fetch(origin+'/api/clara/session?'+new URLSearchParams(scope),{headers:{cookie:headerCookie}})).json();assert.equal(persisted.mission.tasks.find(task=>task.id===manual.id).completed,completed);
 }
 const createB=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:'clara_auth_session='+'B'.repeat(43),origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(createB.status,200);
 const selectedB=(await createB.json()).data,selectionBCookie=createB.headers.get('set-cookie').split(';',1)[0];
 const bCookie='clara_auth_session='+'B'.repeat(43)+'; '+selectionBCookie;
 const missionB=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:bCookie,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createMission',title:'PRIVATE_NATIVE_B_P1',objective:'PRIVATE_OBJECTIVE_B'})});assert.equal(missionB.status,200);const bMission=(await missionB.json()).mission;
 const deniedMutation=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:headerCookie,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'setMissionStatus',missionId:bMission.id,status:'completed'})});assert.equal(deniedMutation.status,403);
 const bContext=await browser.newContext();await bContext.addCookies([{name:'clara_auth_session',value:'B'.repeat(43),url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(selectedB)),url:origin,httpOnly:true,secure:true},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await bContext.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
 const bPage=await bContext.newPage();for(const path of ['/','/missions','/conversations']){await bPage.goto(origin+path);assert.equal(await bPage.locator('[data-native-authority="locked"]').count(),0);const body=await bPage.locator('body').innerText();assert.ok(!body.includes('PRIVATE_NATIVE_A_P1'));assert.ok(!body.includes('NATIVE_CHAT_A'));if(path!=='/conversations')assert.ok(body.includes('PRIVATE_NATIVE_B_P1'));}await bContext.close();
 const foreign=await fetch(origin+'/api/clara/session?'+new URLSearchParams(scope),{headers:{cookie:'clara_auth_session='+'B'.repeat(43)}});assert.equal(foreign.status,403);
 const other=await fetch(origin+'/api/clara/session?'+new URLSearchParams({...scope,projectId:'p2'}),{headers:{cookie:'clara_auth_session='+'A'.repeat(43)}});assert.equal(other.status,403);
 const originDenied=await fetch(origin+'/api/clara/chat',{method:'POST',headers:{cookie:headerCookie,origin:'https://foreign.example','Content-Type':'application/json'},body:'{"message":"MUST_NOT_PERSIST"}'});assert.equal(originDenied.status,403);
 const drive=await fetch(origin+'/api/documents?fileId=foreign-drive-file',{headers:{cookie:headerCookie}});assert.equal(drive.status,409);const driveBody=await drive.text();assert.ok(driveBody.includes('NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED'));assert.ok(!driveBody.includes('PRIVATE_OBJECTIVE_A'));
 assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+process.env.NATIVE_TEST_DATABASE,'utf8'),'','No global loader may be attempted, even if its error is caught.');
 await context.close();
 }finally{await browser.close();}
});
