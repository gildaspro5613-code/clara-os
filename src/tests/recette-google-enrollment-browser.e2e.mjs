import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.RECETTE_ENROLLMENT_E2E_ORIGIN;
if(!origin||new URL(origin).hostname!=='127.0.0.1')throw Error('Local isolated enrollment server required');
test('invitation page is usable in browser; a foreign-origin POST cannot initiate enrollment',async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const external=[];
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==origin){external.push('blocked');return route.abort();}
   return route.continue();
  });
  await page.goto(origin+'/auth/recette-enrollment');
  await page.getByRole('heading',{name:'Accès administrativement autorisé — Recette'}).waitFor();
  assert.equal(await page.getByLabel('Invitation à usage unique').getAttribute('type'),'password');
  await page.getByLabel('Invitation à usage unique').fill('t'.repeat(43));
  const response=page.waitForResponse(r=>r.url()===origin+'/api/auth/google/enroll'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Vérifier mon compte Google'}).click();
  const refused=await response;assert.equal(refused.status(),403);assert.deepEqual(await refused.json(),{success:false,code:'RECETTE_ENROLLMENT_REFUSED'});
  assert.equal(external.length,0);
 }finally{await browser.close();}
});
