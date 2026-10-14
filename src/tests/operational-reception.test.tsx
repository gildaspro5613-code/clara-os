import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { createSession } from "../lib/core/session";
import { cockpitEmails } from "../lib/presentation/cockpit-summary";
import BriefPanel from "../components/cockpit/panels/BriefPanel";
import SummaryPanel from "../components/cockpit/panels/SummaryPanel";
import ConversationsPanel from "../components/cockpit/panels/ConversationsPanel";
import EmailSummaryPanel from "../components/cockpit/panels/EmailSummaryPanel";
import MissionsStage from "../modules/missions/MissionsStage";
import type { Mission } from "../modules/missions/types/Mission";

// The standalone tsx test loader uses classic JSX for imported components.
// Supply its JSX runtime only in this isolated test process; Next builds use their own runtime.
Reflect.set(globalThis, "React", React);

function sourceSession() {
  const session = createSession();
  session.conversation = [{id:"message-a",role:"clara",content:"PRIVATE_FULL_EMAIL_BODY",createdAt:"2026-10-14T12:00:00Z"}];
  session.sources = [{source:"google-gmail",available:true,summary:"PRIVATE_FULL_EMAIL_BODY",data:{messages:[
    {id:"mail123",subject:"Original subject",from:"sender@example.invalid",labelIds:["IMPORTANT"],snippet:"PRIVATE_EMAIL_SNIPPET",body:"PRIVATE_FULL_EMAIL_BODY"},
    {id:"https://evil.invalid",subject:"unsafe",from:"bad"},
    {id:"mail123",subject:"duplicate"},
  ]}}];
  return session;
}
function messages(locale:string){const root=`src/i18n/messages/${locale}`;return {...JSON.parse(readFileSync(`${root}/index.json`,'utf8')),ui:JSON.parse(readFileSync(`${root}/consolidated-ui.json`,'utf8')),missionsPage:JSON.parse(readFileSync(`${root}/missions.json`,'utf8'))};}

test("cockpit email projection preserves metadata and source without bodies, snippets, duplicates or unsafe IDs",()=>{
 const session=sourceSession(),before=JSON.stringify(session);const emails=cockpitEmails(session);
 assert.equal(emails.length,1);assert.equal(emails[0].sender,"sender@example.invalid");assert.equal(emails[0].subject,"Original subject");assert.equal(emails[0].important,true);assert.equal(emails[0].href,"https://mail.google.com/mail/u/0/#all/mail123");assert.equal(JSON.stringify(session),before);
 assert.ok(!JSON.stringify(emails).includes("PRIVATE_"));
 session.sources[0].available=false;assert.deepEqual(cockpitEmails(session),[]);
});

test("five-language populated cockpit never renders full conversation/email bodies and retains actionable source links",()=>{
 for(const locale of ['fr','en','es','de','it']){
  const session=sourceSession(),before=JSON.stringify(session);
  const html=renderToStaticMarkup(<NextIntlClientProvider locale={locale} timeZone="UTC" messages={messages(locale)}><BriefPanel session={session}/><SummaryPanel session={session}/><ConversationsPanel session={session}/><EmailSummaryPanel session={session}/></NextIntlClientProvider>);
  assert.ok(!html.includes('PRIVATE_'),locale);assert.ok(html.includes('Original subject'));assert.ok(html.includes('sender@example.invalid'));assert.ok(html.includes('mail123'));assert.ok(html.includes('/conversations'));assert.equal(JSON.stringify(session),before);
 }
});

test("all active registry missions remain visible and a blocked focus is never labeled active",()=>{
 const fixtures=Array.from({length:6},(_,index):Mission=>({id:`mission-${index}`,title:`Source mission ${index}`,objective:'Original objective',status:index===0?'blocked':'active',priority:'medium',createdAt:new Date('2026-10-14'),tasks:[],progress:0}));
 const before=JSON.stringify(fixtures);
 for(const locale of ['fr','en','es','de','it']){
  const catalog=messages(locale);const html=renderToStaticMarkup(<NextIntlClientProvider locale={locale} timeZone="UTC" messages={catalog}><MissionsStage initialMissions={fixtures} currentMissionId="mission-0"/></NextIntlClientProvider>);
  for(let i=0;i<6;i++)assert.ok(html.includes(`Source mission ${i}`),`${locale} mission ${i}`);
  assert.ok(html.includes(catalog.missionsPage.status.blocked));assert.equal(JSON.stringify(fixtures),before);
 }
});

test("all native Clara states and conversations title resolve in five locales",()=>{
 for(const locale of ['fr','en','es','de','it']){const catalog=messages(locale);assert.equal(catalog.pages.conversations,catalog.navigation.conversations);for(const state of ['STARTING','WORKING','STOPPING','STOPPED','UNKNOWN'])assert.ok(catalog.pages.states[state] && catalog.pages.states[state]!==state);}
});

test("new commercial drafts follow declared source locale without changing approval, identity or intake data",async()=>{
 const {buildCommercialQualificationDraft}=await import('../lib/acquisition/commercial-communication-draft');
 const {createTranslator}=await import('next-intl');
 for(const locale of ['fr','en','es','de','it']){
  const intake={source:{locale},contact:{name:'Alex Example',email:'alex@example.invalid'}} as import('../types').MdProjectIntake;
  const record={submissionId:'synthetic',lifecycle:{state:'qualifying'},qualification:{qualification:{completeness:'needs-information',missing:['location','schedule','disciplines','contactName']},opportunity:{projectType:'Original project type',brief:'Original source brief'}}} as import('../lib/acquisition/acquisition-store').AcquisitionRecord;
  const before=JSON.stringify({intake,record});const draft=buildCommercialQualificationDraft(record,intake)!;
  const catalog=JSON.parse(readFileSync(`src/i18n/messages/${locale}/commercial-draft.json`,'utf8'));const t=createTranslator({locale,messages:catalog});
  assert.ok(draft.body.includes(t('greeting',{name:'Alex'})));assert.ok(draft.body.includes(t('location')));assert.equal(draft.subject,t('subject',{projectType:'Original project type'}));
  assert.equal(draft.recipient.email,intake.contact.email);assert.equal(draft.sender.email,'clara@melodie.digital');assert.equal(draft.approval.required,true);assert.equal(draft.approval.status,'pending');assert.equal(draft.delivery.allowed,false);assert.equal(JSON.stringify({intake,record}),before);
 }
});

test("server Missions page preserves blocked status without execution metadata and uses the durable thread focus",async()=>{
 const ts=await import('typescript'),vm=await import('node:vm'),{createRequire}=await import('node:module'),{resolve}=await import('node:path');
 const fixture:Mission={id:'owned-blocked',title:'Original title',objective:'Original objective',status:'blocked',priority:'high',createdAt:new Date('2026-10-14'),tasks:[{id:'manual',title:'Original action',completed:false}],progress:0};
 const before=JSON.stringify(fixture),exports:Record<string,unknown>={},require=createRequire(resolve('src/app/missions/page.tsx'));
 const mocks:Record<string,unknown>={
  '@/components/layout/MainLayout':{default:()=>null},'@/modules/missions/MissionsStage':{default:()=>null},
  '@/modules/missions/mission-store':{loadMissions:async()=>[fixture]},
  '@/lib/core/operational-context':{resolveOperationalContext:async()=>({session:{mission:fixture}})}
 };
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/missions/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>mocks[name]??require(name),console});
 const page=await (exports.default as()=>Promise<React.ReactElement<{children:React.ReactElement<{initialMissions:Mission[];currentMissionId:string}>}>>)();
 assert.equal(page.props.children.props.initialMissions[0].status,'blocked');assert.equal(page.props.children.props.currentMissionId,fixture.id);assert.equal(JSON.stringify(fixture),before);
});

test("cockpit with no selected mission distinguishes the current thread from five active registry missions",async()=>{
 const ts=await import('typescript'),vm=await import('node:vm'),{createRequire}=await import('node:module'),{resolve}=await import('node:path'),{createTranslator}=await import('next-intl');
 for(const locale of ['fr','en','es','de','it']){
  const catalog=messages(locale),exports:Record<string,unknown>={},require=createRequire(resolve('src/components/cockpit/widgets/missions/MissionWidget.tsx'));
  vm.runInNewContext(ts.transpileModule(readFileSync('src/components/cockpit/widgets/missions/MissionWidget.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>name==='next-intl/server'?{getTranslations:async(namespace:string)=>createTranslator({locale,messages:catalog,namespace})}:require(name)});
  const widget=await (exports.default as(props:{mission:null;activeCount:number})=>Promise<React.ReactElement>)({mission:null,activeCount:5});
  const html=renderToStaticMarkup(widget),ui=createTranslator({locale,messages:catalog,namespace:'ui'});
  assert.ok(html.includes(ui('noCurrentFocus')));assert.ok(html.includes(ui('registryActiveCount',{count:5})));assert.ok(!html.includes(catalog.cockpitUi.noMission));
 }
});
