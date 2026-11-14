import {ConnectorBuilderDirectory} from './connector-builder-directory';
import {executeNativeConnectorRead,type NativeConnectorReadAudit,
 type NativeConnectorReadAuthority,type NativeConnectorReadExecutor} from './native-connector-read-gateway';
import {nativeBuilderReadAuthority,nativeBuilderReadAudit,nativeBuilderReadExecutor} from './native-connector-builder-runtime';

export interface NativeBuilderToolCall{
 readonly callId:string;
 readonly name:string;
 readonly arguments:string;
}
export type NativeBuilderToolResult={
 readonly callId:string;
 readonly capabilityId:string;
 readonly available:boolean;
 readonly source?:string;
 readonly content?:string;
 readonly code?:'CONNECTOR_NOT_AVAILABLE'|'CONNECTOR_INPUT_INVALID'|'CONNECTOR_READ_UNAVAILABLE';
};
export interface NativeBuilderToolDependencies{
 directory:ConnectorBuilderDirectory;
 authority:NativeConnectorReadAuthority;
 audit:NativeConnectorReadAudit;
 executor:NativeConnectorReadExecutor;
}
/** The common Brain connector tool boundary.
 * Inputs are a capabilityId and capability-specific arguments only.
 * User identity, connectionId, approval and workspace are NEVER accepted as
 * model-provided authority. The adapter chain is the existing Connector Core.
 */
export async function executeNativeBuilderToolCall(
 call:NativeBuilderToolCall,
 dependencies?:NativeBuilderToolDependencies,
):Promise<NativeBuilderToolResult>{
 const deps=dependencies??(()=>{
  const directory=new ConnectorBuilderDirectory();
  return {directory,authority:nativeBuilderReadAuthority,
   audit:nativeBuilderReadAudit,executor:nativeBuilderReadExecutor(directory)};
 })();
 const name=typeof call?.name==='string'?call.name:'';
 const base={callId:typeof call?.callId==='string'?call.callId:'',capabilityId:name};
 if(!deps.directory.findRead(name))
  return {...base,available:false,code:'CONNECTOR_NOT_AVAILABLE'};
 let args:unknown;
 try{
  if(typeof call.arguments!=='string'||call.arguments.length>4096)
   throw Error('unsupported');
  args=JSON.parse(call.arguments);
 }catch{
  return {...base,available:false,code:'CONNECTOR_INPUT_INVALID'};
 }
 try{
  const context=await executeNativeConnectorRead(name,args,
   deps.directory,deps.authority,deps.executor,deps.audit);
  // Result is untrusted and bounded by the gateway. No credentials are
  // included; the caller must treat content as untrusted evidence only.
  return {...base,available:true,source:context.source,content:context.summary};
 }catch{
  // Do not expose provider/API/SQL errors or attempt automatic retries.
  return {...base,available:false,code:'CONNECTOR_READ_UNAVAILABLE'};
 }
}
