import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if (!origin || !['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Isolated localhost server required');
test('five locales render all twelve routes without missing translations or provider secrets',async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox']});
 try {for(const locale of ['fr','en','es','de','it']){
  const messages=JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/index.json`,import.meta.url)));
  const context=await browser.newContext();
  await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==new URL(origin).origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{success:false,connected:false,authenticated:false,message:'PRIVATE_PROVIDER_SECRET'}});
   return route.continue();
  });
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))errors.push(m.text());});
  for(const path of ['/','/clara','/missions','/conversations','/contacts','/telephonie','/automatisations','/documents','/agenda','/journal','/brain','/connexions']){
   const response=await page.goto(origin+path);assert.equal(response.status(),200,`${locale} ${path}`);
   await page.getByRole('link',{name:messages.navigation.documents,exact:true}).first().waitFor();
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   assert.equal((await page.locator('body').innerText()).includes('PRIVATE_PROVIDER_SECRET'),false,`${locale} ${path}`);
  }
  assert.deepEqual(errors,[],locale);await context.close();
 }} finally {await browser.close();}
});
