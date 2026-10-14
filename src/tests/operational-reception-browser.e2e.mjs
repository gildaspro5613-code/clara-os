import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Isolated localhost server required');
test('populated reception: five locales, source provenance, scoped focus, email summary and durable original conversation',async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{for(const locale of ['fr','en','es','de','it']){
  const catalog=JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/index.json`,import.meta.url)));
  const missionCatalog=JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/missions.json`,import.meta.url)));
  const ui=JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/consolidated-ui.json`,import.meta.url)));
  const context=await browser.newContext();await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
  const mutations=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==new URL(origin).origin)return route.abort();if(url.pathname.startsWith('/api/')){
   if(route.request().method()!=='GET')mutations.push(url.pathname);
   if(url.pathname==='/api/clara/acquisition/commercial-draft'&&route.request().method()==='PATCH'){
    const data=route.request().postDataJSON();assert.equal(data.submissionId,'synthetic-submission');assert.equal(data.subject,'Edited synthetic subject');assert.equal(data.body,'Edited synthetic draft body');
    return route.fulfill({json:{success:true,draft:{...data,schema:'clara.commercial-communication-draft.v1',channel:'email',sender:{name:'Clara',email:'clara@melodie.digital'},recipient:{name:'Synthetic contact',email:'contact@example.invalid'},revision:2,approval:{required:true,status:'pending'},delivery:{allowed:false,reason:'operator-approval-required'}}}});
   }
   return route.fulfill({json:{success:false,connected:false,authenticated:false}});
  }return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))errors.push(m.text());});
  await page.goto(origin);await page.getByRole('link',{name:catalog.navigation.documents,exact:true}).first().waitFor();
  let body=await page.locator('body').innerText();assert.ok(!body.includes('PRIVATE_FULL_EMAIL_BODY'));assert.ok(!body.includes('PRIVATE_EMAIL_SNIPPET'));assert.ok(!body.includes('PRIVATE_DRAFT_BODY'));assert.ok(!body.includes('PRIVATE_REQUEST_SOURCE'));assert.ok(body.includes('Synthetic draft subject'));assert.ok(await page.getByRole('link',{name:ui.reviewDraft+' →'}).count());assert.ok(body.includes('Original subject'));assert.ok(body.includes('sender@example.invalid'));assert.ok(body.includes(ui.importantEmail));assert.ok(await page.locator('a[href="https://mail.google.com/mail/u/0/#all/mail123"]').count());
  await page.goto(origin+'/clara');assert.ok((await page.locator('body').innerText()).includes('PRIVATE_DRAFT_BODY'));await page.getByRole('button',{name:ui.edit,exact:true}).click();const editor=page.locator('#commercial-draft');await editor.locator('input').fill('Edited synthetic subject');await editor.locator('textarea').fill('Edited synthetic draft body');await editor.getByRole('button',{name:ui.save,exact:true}).click();await editor.getByText('Edited synthetic draft body',{exact:true}).waitFor();assert.deepEqual(mutations,['/api/clara/acquisition/commercial-draft']);await page.getByText(catalog.pages.states.STARTING,{exact:true}).waitFor();assert.equal(await page.getByText('STARTING',{exact:true}).count(),0);
  await page.goto(origin+'/conversations');await page.getByRole('heading',{name:catalog.pages.conversations,exact:true}).waitFor();assert.ok((await page.locator('body').innerText()).includes('PRIVATE_FULL_EMAIL_BODY'));
  await page.goto(origin+'/missions');await page.getByText(missionCatalog.status.blocked,{exact:true}).first().waitFor();for(let i=0;i<6;i++)await page.getByText(`Source mission ${i}`,{exact:true}).first().waitFor();assert.ok((await page.locator('body').innerText()).includes(ui.sourceOriginal));
  await page.goto(origin+'/conversations');assert.ok((await page.locator('body').innerText()).includes('PRIVATE_FULL_EMAIL_BODY'));
  assert.deepEqual(errors,[],locale);await context.close();
 }}finally{await browser.close();}
});
