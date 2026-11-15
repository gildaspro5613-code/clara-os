import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
import type {ReactElement} from 'react';
import ts from 'typescript';

const NativeVoice=()=>null,LegacyVoice=()=>null,Chat=()=>null,Other=()=>null;
const scope={workspaceId:'workspace-a',clientId:'client-a',projectId:'project-a',sessionId:'session-a'};
type Element=ReactElement<Record<string,unknown>>;
function descendants(value:unknown):Element[]{
 if(Array.isArray(value))return value.flatMap(descendants);
 if(!value||typeof value!=='object'||!('props' in value))return [];
 const element=value as Element;return [element,...descendants(element.props.children)];
}
function pageHarness({native=true,certified=true,denied=false,sessionId='session-a'}={}){
 const file='src/app/clara/page.tsx',exports:Record<string,unknown>={},require=createRequire(resolve(file));
 let reads=0;
 const context=native?{scope:{...scope,sessionId,actorId:'never-send-actor-to-browser'},principal:{token:'never-send-principal'}}:null;
 const messages=[{id:'existing-message',role:'user',content:'Conversation existante'}];
 const modules:Record<string,unknown>={
  '@/lib/native/scoped-context':{nativeContext:()=>context,nativeThreadCertified:()=>certified},
  '@/lib/native/page-fence':{nativePage:async(run:()=>unknown)=>{if(denied)throw Error('TEST_AUTHORITY_DENIED');return run();}},
  'next-intl/server':{getTranslations:async()=>Object.assign((key:string)=>key,{has:()=>false})},
  '@/lib/core/operational-context':{resolveOperationalContext:async()=>{reads++;return {session:{mission:null,state:'READY',user:{firstName:'Opérateur'},conversation:messages},acquisition:null};}},
  '@/components/cockpit/widgets/voice/ClaraVoiceWidget':{default:NativeVoice},
  '@/components/clara/ClaraVoiceWidget':{default:LegacyVoice},
  '@/components/cockpit/widgets/clara/ClaraChatWidget':{default:Chat},
 };
 for(const match of readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g))if(!(match[1] in modules))modules[match[1]]={default:Other};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>modules[name]??require(name)});
 return {run:async()=>descendants(await (exports.default as(props:object)=>Promise<unknown>)({})),reads:()=>reads,messages};
}

test('Clara page mounts existing native voice beside text using the same certified conversation',async()=>{
 const h=pageHarness(),tree=await h.run(),voice=tree.filter(e=>e.type===NativeVoice),chat=tree.find(e=>e.type===Chat)!;
 assert.equal(voice.length,1);assert.equal(tree.some(e=>e.type===LegacyVoice),false);
 assert.deepEqual(JSON.parse(JSON.stringify(voice[0].props.scope)),scope);
 assert.equal(voice[0].props.disabled,false);assert.equal(voice[0].key,scope.sessionId);
 assert.equal(chat.props.nativeSessionId,scope.sessionId);assert.equal(chat.key,scope.sessionId);
 assert.equal(chat.props.initialMessages,h.messages);assert.equal(chat.props.nativeThreadReadOnly,false);
 assert.ok(!JSON.stringify(voice[0].props).includes('never-send'));
});
test('uncertified native conversation keeps voice disabled without falling back to the legacy provider',async()=>{
 const tree=await pageHarness({certified:false}).run();
 assert.equal(tree.find(e=>e.type===NativeVoice)?.props.disabled,true);
 assert.equal(tree.find(e=>e.type===Chat)?.props.nativeThreadReadOnly,true);
 assert.equal(tree.some(e=>e.type===LegacyVoice),false);
});
test('changing the selected conversation keys both interfaces to the new native session',async()=>{
 const tree=await pageHarness({sessionId:'session-b'}).run();
 assert.equal(tree.find(e=>e.type===NativeVoice)?.key,'session-b');
 assert.equal(tree.find(e=>e.type===Chat)?.key,'session-b');
 assert.equal((tree.find(e=>e.type===NativeVoice)?.props.scope as typeof scope).sessionId,'session-b');
});
test('page authority refuses before loading a conversation or exposing an audio control',async()=>{
 const h=pageHarness({denied:true});await assert.rejects(h.run,/TEST_AUTHORITY_DENIED/);assert.equal(h.reads(),0);
});
test('non-native page keeps its existing provider component and never invents native scope',async()=>{
 const tree=await pageHarness({native:false}).run();
 assert.equal(tree.filter(e=>e.type===LegacyVoice).length,1);assert.equal(tree.some(e=>e.type===NativeVoice),false);
 assert.equal(tree.find(e=>e.type===Chat)?.props.nativeSessionId,undefined);
});
