import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||new URL(origin).protocol!=="http:"||!["localhost","127.0.0.1"].includes(new URL(origin).hostname))throw Error("Local isolated server required");
test("browser: named canonical selection, active refusal, archive, reopened history and denied rights",async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,args:["--no-sandbox"]});
 const context=await browser.newContext({locale:"fr-FR"});await context.addCookies([{name:"NEXT_LOCALE",value:"fr",url:origin}]);
 const page=await context.newPage();let state="active",saved=null,denied=false,writes=0;
 await context.route("**/*",async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(!url.pathname.startsWith("/api/"))return route.continue();
  let data={success:false,authenticated:false,connected:false};
  if(url.pathname==="/api/documents")data={success:true,files:[]};
  if(url.pathname==="/api/canonical/registry"){
   if(route.request().method()==="GET")data={success:true,data:[{workspace_id:"w"}]};
   else if(route.request().postDataJSON().action==="listProjects")data={success:true,data:[{id:"p",displayName:"Spectacle nommé",liveProjectId:"lp"},{id:"p2",displayName:"Projet sans liaison",liveProjectId:null}]};
   else data={success:true,data:[{id:"c",displayName:"Client nommé",projects:[]}]};
  }
  if(url.pathname==="/api/documents/live-archives"){
   if(denied)return route.fulfill({status:403,json:{success:false}});
   if(route.request().method()==="POST"){writes++;assert.deepEqual(route.request().postDataJSON(),{workspaceId:"w",clientId:"c",projectId:"p"});saved={archivedAt:new Date().toISOString()};data={success:true,data:saved};}
   else data={success:true,data:{reference:saved,currentStatus:state,archivable:state==="completed",sourceUrl:"https://live.melodie.digital/projects/lp"}};
  }
  await route.fulfill({json:data});
 });
 try{
  await page.goto(origin+"/documents");const section=page.getByRole("region",{name:"Projets Clara Live archivés"});
  await section.getByRole("combobox",{name:/^Client/}).selectOption({label:"Client nommé"});
  await section.getByRole("combobox",{name:/^Projet/}).selectOption({label:"Spectacle nommé"});
  await section.getByText("Statut Live actuel : actif",{exact:true}).waitFor();assert.equal(await section.getByRole("button",{name:"Archiver le projet terminé"}).isDisabled(),true);assert.equal(writes,0);
  state="completed";await section.getByRole("combobox",{name:/^Projet/}).selectOption("");await section.getByRole("combobox",{name:/^Projet/}).selectOption("p");
  await section.getByText("Statut Live actuel : terminé",{exact:true}).waitFor();await section.getByRole("button",{name:"Archiver le projet terminé"}).click();await section.getByText(/Archive administrative conservée depuis/).waitFor();assert.equal(writes,1);
  state="active";await section.getByRole("combobox",{name:/^Projet/}).selectOption("");await section.getByRole("combobox",{name:/^Projet/}).selectOption("p");await section.getByText("Statut Live actuel : actif",{exact:true}).waitFor();assert.equal(await section.getByText(/Archive administrative conservée depuis/).isVisible(),true);
  assert.equal(await section.getByRole("link",{name:"Ouvrir le projet dans Clara Live"}).getAttribute("href"),"https://live.melodie.digital/projects/lp");
  denied=true;await section.getByRole("combobox",{name:/^Projet/}).selectOption("");await section.getByRole("combobox",{name:/^Projet/}).selectOption("p");await section.getByText("Les droits ou le statut de ce projet ne peuvent pas être vérifiés.").waitFor();assert.equal(await section.getByRole("link").count(),0);
 } finally{await context.close();await browser.close();}
});
