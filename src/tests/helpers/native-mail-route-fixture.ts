import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import ts from 'typescript';
import {withNativeScope} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {registryBody} from '@/lib/canonical/http';
import {NativeMail,sendNativeMail,type MailTransportFactory} from '@/lib/native/mail';
import type {RegistryQuery} from '@/lib/canonical/registry';
/** Test-only dependency injection at the provider boundary. The actual route,
 * authorization, services, business stores and SQL execute without replacement. */
export function nativeMailRouteFixture(query:RegistryQuery,factory:MailTransportFactory){
 const file='src/app/api/native/mail/route.ts',require=createRequire(resolve(file)),exports:Record<string,unknown>={};
 const modules:Record<string,unknown>={
  '@/lib/native/scoped-context':{withNativeScope:(r:Request,w:boolean,f:()=>Promise<Response>)=>withNativeScope(r,w,f,query),nativeRequest:async(r:Request,f:()=>Promise<Response>)=>{try{return await withNativeScope(r,true,async()=>{await registryBody(r.clone());return f();},query);}catch(e){return nativeFailure(e);}}},
  '@/lib/native/mail':{NativeMail:class extends NativeMail{constructor(id:string){super(id,factory);}},sendNativeMail:(r:Request,id:string,operationId:string,token:string)=>sendNativeMail(r,id,operationId,token,factory,query)},
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>modules[name]??require(name),Request,Response,Headers,URL,Buffer});
 return exports as {GET:(r:Request)=>Promise<Response>;POST:(r:Request)=>Promise<Response>};
}
