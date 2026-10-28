// Legacy business/component tests use an explicit fence mock; they do not validate server authorization.
// See native-authority tests and real HTTP/browser reception for the production boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { responseLanguageInstruction, safeResponseLocale } from "../i18n/response-language";
import {readFileSync, readdirSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {parse} from "@formatjs/icu-messageformat-parser";
import {createTranslator} from "next-intl";
import {composeClaraResponseWithProposal} from "../lib/brain/response-composer";
import {OpenAIResponsesEngine} from "../lib/connectors/internal/openai/responses/openai-responses-engine";
import {createSession} from "../lib/core/session";
import { locales } from "../i18n/config";

const dictionaries = ["index", "journal", "missions", "automations-brevo", "automations-make", "consolidated-ui", "commercial-draft"] as const;

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key));
}

test("all five locale dictionaries share identical keys", async () => {
  for (const dictionary of dictionaries) {
    const baseline = await import(`../i18n/messages/fr/${dictionary}.json`);
    const expected = flatten(baseline.default).sort();
    for (const locale of locales) {
      const translated = await import(`../i18n/messages/${locale}/${dictionary}.json`);
      assert.deepEqual(flatten(translated.default).sort(), expected, `${locale}/${dictionary}`);
    }
  }
});

test("Clara response language covers every supported locale", () => {
  for (const locale of locales) {
    assert.ok(responseLanguageInstruction(locale).length > 40);
    assert.equal(safeResponseLocale(locale), locale);
  }
  assert.equal(safeResponseLocale("xx"), "fr");
  assert.equal(safeResponseLocale(null), "fr");
});

function leaves(value:unknown,prefix=""):Array<[string,string]> {
  if(typeof value==='string')return [[prefix,value]];
  assert.ok(value && typeof value==='object');
  return Object.entries(value).flatMap(([key,item])=>leaves(item,prefix?prefix+"."+key:key));
}
function argumentsOf(message:string){
  const result=new Map<string,number>();
  function walk(elements:ReturnType<typeof parse>){for(const e of elements){if(e.type>=1 && e.type<=6)result.set((e as {value:string}).value,e.type);if('options' in e)for(const option of Object.values(e.options))walk(option.value);if('children' in e)walk(e.children);}}
  walk(parse(message));return result;
}
function catalog(locale:string){const base=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8'));for(const [namespace,file]of Object.entries({ui:'consolidated-ui',journalPage:'journal',missionsPage:'missions',automationsBrevo:'automations-brevo',automationsMake:'automations-make'}))base[namespace]=JSON.parse(readFileSync(`src/i18n/messages/${locale}/${file}.json`,'utf8'));return base;}

test("every dictionary message is nonempty valid ICU with matching parameters and renders in five languages",()=>{
 let checked=0;
 for(const dictionary of dictionaries){const reference=leaves(JSON.parse(readFileSync(`src/i18n/messages/fr/${dictionary}.json`,'utf8')));
  for(const locale of locales){const messages=JSON.parse(readFileSync(`src/i18n/messages/${locale}/${dictionary}.json`,'utf8'));const actual=new Map(leaves(messages));const translate=createTranslator({locale,messages,onError:error=>{throw error;}});
   for(const [key,original]of reference){const value=actual.get(key)!;assert.ok(value.trim(),`${locale}/${dictionary}/${key}`);assert.deepEqual([...argumentsOf(value).keys()].sort(),[...argumentsOf(original).keys()].sort(),key);
    const args=Object.fromEntries([...argumentsOf(value)].map(([name,type])=>[name,type===2||type===6?2:type===3||type===4?new Date('2026-10-13T12:00:00Z'):'Synthetic']));
    assert.ok(translate(key,args).trim());checked++;
   }
  }
 }
 assert.ok(checked>2000);console.info(`Checked ${checked} translated messages.`);
});

test("all static translation calls in pages, components, modules and API resolve to real catalog keys",()=>{
 const files=['src/app','src/components','src/modules'].flatMap(root=>readdirSync(root,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>resolve(entry.parentPath,entry.name))).filter(p=>p.endsWith('.tsx')||p.endsWith('.ts'));const messages=catalog('fr');let checked=0;
 const lookup=(key:string)=>key.split('.').reduce<unknown>((value,part)=>value && typeof value==='object' ? (value as Record<string,unknown>)[part] : undefined,messages);
 for(const file of files){const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const names=new Map<string,Set<string>>();
  function namespace(initializer: ts.Expression | undefined): string | null {
   if (initializer && ts.isAwaitExpression(initializer)) initializer = initializer.expression;
   if (!initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) || !['getTranslations','useTranslations'].includes(initializer.expression.text)) return null;
   const arg = initializer.arguments[0]; return arg && ts.isStringLiteral(arg) ? arg.text : null;
  }
  function register(name: string, value: string | null) { if(value) { const list=names.get(name)??new Set<string>();list.add(value);names.set(name,list); } }
  function declarations(node:ts.Node) {
   if(ts.isVariableDeclaration(node)) {
    if(ts.isIdentifier(node.name)) register(node.name.text,namespace(node.initializer));
    else if(ts.isArrayBindingPattern(node.name)) {
     let initializer=node.initializer;if(initializer && ts.isAwaitExpression(initializer))initializer=initializer.expression;
     if(initializer && ts.isCallExpression(initializer) && ts.isPropertyAccessExpression(initializer.expression) && initializer.expression.expression.getText(ast)==='Promise' && initializer.expression.name.text==='all') {
      const args=initializer.arguments[0];if(args && ts.isArrayLiteralExpression(args))node.name.elements.forEach((entry,index)=>{if(ts.isBindingElement(entry)&&ts.isIdentifier(entry.name))register(entry.name.text,namespace(args.elements[index]));});
     }
    }
   }
   ts.forEachChild(node,declarations);
  } declarations(ast);
  function calls(node:ts.Node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&names.has(node.expression.text)){const key=node.arguments[0];if(key&&ts.isStringLiteral(key)){assert.ok([...names.get(node.expression.text)!].some(ns=>typeof lookup(ns+'.'+key.text)==='string'),`${file}: ${node.expression.text}(${key.text})`);checked++;}}ts.forEachChild(node,calls);}calls(ast);
 }
 assert.ok(checked>200);console.info(`Checked ${checked} static translation calls.`);
});

test("new Clara responses use selected locale, preserve original quotations and leave Brain/session data untouched",async(t)=>{
 let prompt='';t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(input)=>{prompt=input.prompt;return {success:true,responseStatus:'completed',content:'Original quote: « Ne pas traduire »',message:'Synthetic',completedAt:new Date()};});
 const session=createSession();session.conversation=[{id:'synthetic',role:'user',content:'Original business fact: ORIGINS',createdAt:'2026-10-13T12:00:00Z'}];const before=JSON.stringify(session);
 for(const locale of locales){const response=await composeClaraResponseWithProposal('Please continue.',session,locale);assert.match(prompt,new RegExp(responseLanguageInstruction(locale).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(response.content,'Original quote: « Ne pas traduire »');assert.equal(JSON.stringify(session),before);}
});

test("telephony API localizes errors, preserves public identifiers and never echoes provider exceptions or secrets",async()=>{
 const require=createRequire(resolve('src/app/api/telephony/route.ts'));let result:unknown,locale='fr',calls=0;const logs:string[]=[];const exports:Record<string,unknown>={};
 const source=readFileSync('src/app/api/telephony/route.ts','utf8');
 const modules:Record<string,unknown>={'@/lib/auth/voice-request-authorization':{authorizeVoiceRequest:async()=>true},'next/server':{NextResponse:Response},'next-intl/server':{getTranslations:async()=>createTranslator({locale,messages:catalog(locale),namespace:'telephony'})},'@/lib/connectors/internal/telephony':{TELEPHONY_MODULE:{engine:{execute:async()=>{calls++;if(result instanceof Error)throw result;return result;}}}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>modules[name]??require(name),console:{error:(...args:unknown[])=>logs.push(args.join(' '))}});
 const post=exports.POST as (request:Request)=>Promise<Response>;
 const request=(body:unknown)=>new Request('https://fixture.invalid/api/telephony',{method:'POST',body:JSON.stringify(body)});
 for(const language of locales){locale=language;const t=createTranslator({locale,messages:catalog(locale),namespace:'telephony'});
  assert.equal((await (await post(request({}))).json()).error,t('missingNumber'));
  for(const failure of [{success:false,error:'PRIVATE_PROVIDER_SECRET'},new Error('PRIVATE_PROVIDER_SECRET')]){result=failure;const response=await post(request({toNumber:'+33000000000'}));const body=await response.json();assert.equal(body.error,t('callError'));assert.ok(!JSON.stringify(body).includes('PRIVATE_PROVIDER_SECRET'));}
  result={success:true,operation:'outbound-call',conversationId:'synthetic-conversation',callSid:'synthetic-call',message:'PRIVATE_PROVIDER_SECRET',completedAt:'2026-10-13'};const body=await (await post(request({toNumber:'+33000000000'}))).json();assert.equal(body.callSid,'synthetic-call');assert.equal(body.message,t('callStarted'));assert.ok(!JSON.stringify(body).includes('PRIVATE_PROVIDER_SECRET'));
 }
 assert.equal(calls,15);assert.ok(!logs.join().includes('PRIVATE_PROVIDER_SECRET'));
});

test('native chat localizes empty requests and network failures in all five selected locales',async()=>{
 let locale:typeof locales[number]='fr';
 const source=readFileSync('src/app/api/clara/chat/route.ts','utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exported:{exports:Record<string,unknown>}={exports:{}};
 const dependencies:Record<string,unknown>={
  '@/lib/native/chat':{nativeChatRequest:async(_request:Request,render:()=>Promise<Response>)=>render()},
  '@/lib/native/scoped-context':{nativeRequest:async(_request:Request,render:()=>Promise<Response>)=>render(),nativeContext:()=>undefined},
  '@/lib/native/authority':{nativeOperationFence:async()=>null},
  'next/server':{NextResponse:{json:(body:unknown,options?:ResponseInit)=>Response.json(body,options)}},
  'next/headers':{cookies:async()=>({get:()=>({value:locale})})},
  'next-intl/server':{getTranslations:async(namespace:string)=>createTranslator({locale,messages:catalog(locale),namespace})},
  '@/i18n/config':{LOCALE_COOKIE:'NEXT_LOCALE',resolveLocale:(value:string)=>value}
 };
 vm.runInNewContext(output,{exports:exported.exports,require:(name:string)=>dependencies[name]??{},console});
 const post=exported.exports.POST as (request:Request)=>Promise<Response>;
 for(const language of locales){locale=language;const ui=createTranslator({locale,messages:catalog(locale),namespace:'ui'});
  const empty=await post(new Request('http://localhost/api/clara/chat',{method:'POST',body:JSON.stringify({message:'  '})}));
  assert.equal(empty.status,400);assert.equal((await empty.json()).message,ui('emptyMessage'));
  const failed=await post({json:async()=>{throw new Error('PRIVATE_NETWORK_SECRET');}} as unknown as Request);
  assert.equal(failed.status,500);assert.equal((await failed.json()).message,ui('chatUnavailable'));
 }
});

// Contract evidence only: a simulated composer does not certify provider language quality.
test("native dialogue language is independent of interface locale and preserves all original history",async(t)=>{
 let prompt='';t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(input)=>{prompt=input.prompt;return {success:true,responseStatus:'completed',content:'SYNTHETIC_CONTINUATION',message:'Synthetic',completedAt:new Date()};});
 const messages={fr:'Continuons cette préparation.',en:'Let us continue this preparation.',es:'Continuemos esta preparación.',de:'Setzen wir diese Vorbereitung fort.',it:'Continuiamo questa preparazione.'};
 for(const [language,content]of Object.entries(messages)){
  const session=createSession();session.conversation=[{id:'original-'+language,role:'user',content,createdAt:'2026-10-28T10:00:00Z'}];const before=JSON.stringify(session);
  for(const locale of locales){await composeClaraResponseWithProposal(content,session,locale,'conversation');assert.ok(prompt.includes(content));assert.ok(prompt.includes('La langue de l’interface ne change pas celle du dialogue.'));assert.ok(!prompt.includes(responseLanguageInstruction(locale)));assert.equal(JSON.stringify(session),before);}
 }
});
