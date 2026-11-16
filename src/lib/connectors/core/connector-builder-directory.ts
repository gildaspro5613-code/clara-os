import type {ConnectorDefinition,ConnectorOperationType} from './connector';
import {CapabilityRegistry} from '@/lib/capabilities/capability-registry';
import {GitHubConnectorDefinition} from '@/lib/connectors/github/definition';
import {BrevoConnectorDefinition} from '@/lib/connectors/brevo/definition';
import {MakeConnectorDefinition} from '@/lib/connectors/make/definition';
import {StripeConnectorDefinition} from '@/lib/connectors/stripe/definition';

/** NOT a second capability engine. Reads existing, reviewed provider
 * declarations and intersects them with the already-shipped CapabilityRegistry.
 * Discovery never implies that a client has authenticated, granted authority,
 * or that a provider operation is certified for execution.
 */
export type BuilderCapability={
 readonly provider:string;
 readonly id:string;
 readonly effect:ConnectorOperationType;
 readonly description:string;
};
export type BuilderProvider={
 readonly id:string;
 readonly name:string;
 readonly version:string;
 readonly authentication:ConnectorDefinition['authentication']['type'];
 readonly capabilities:readonly BuilderCapability[];
};

const ID=/^[a-z][a-z0-9._:-]{0,119}$/;
const EFFECTS=new Set<ConnectorOperationType>(['READ','PREPARE','WRITE','EXECUTE']);

export class ConnectorBuilderDirectory {
 private readonly byProvider=new Map<string,BuilderProvider>();
 private readonly byCapability=new Map<string,BuilderCapability>();

 constructor(
  definitions:readonly ConnectorDefinition[]=[
   GitHubConnectorDefinition,BrevoConnectorDefinition,
   MakeConnectorDefinition,StripeConnectorDefinition,
  ],
  supported:Pick<CapabilityRegistry,'has'>=new CapabilityRegistry(),
 ){
  for(const definition of definitions){
   if(!ID.test(definition.id)||this.byProvider.has(definition.id)||
      !definition.name.trim()||
      !/^\d+\.\d+\.\d+$/.test(definition.version)||
      definition.authentication.credentialReference!=='connectionId'||
      !['oauth2','api_key','webhook'].includes(definition.authentication.type))
    throw new Error('CONNECTOR_BUILDER_INVALID_PROVIDER');

   const capabilities:BuilderCapability[]=[];
   for(const cap of definition.capabilities){
    // No executable capability may be introduced by an arbitrary descriptor:
    // it must already be known to the central Clara CapabilityRegistry.
    if(!ID.test(cap.id)||!EFFECTS.has(cap.operationType)||
       typeof cap.description!=='string'||!cap.description.trim()||
       !cap.id.startsWith(definition.id+'.')||
       this.byCapability.has(cap.id)||
       capabilities.some(entry=>entry.id===cap.id))
     throw new Error('CONNECTOR_BUILDER_INVALID_CAPABILITY');
    if(!supported.has(cap.id))continue;
    capabilities.push(Object.freeze({
     provider:definition.id,id:cap.id,effect:cap.operationType,
     description:cap.description,
    }));
   }
   const metadata=Object.freeze({
    id:definition.id,name:definition.name,version:definition.version,
    authentication:definition.authentication.type,
    capabilities:Object.freeze(capabilities),
   });
   this.byProvider.set(metadata.id,metadata);
   for(const cap of capabilities)this.byCapability.set(cap.id,cap);
  }
 }

 listProviders():readonly BuilderProvider[]{return Object.freeze([...this.byProvider.values()]);}
 getProvider(provider:string):BuilderProvider|undefined{return this.byProvider.get(provider);}
 getCapability(capabilityId:string):BuilderCapability|undefined{return this.byCapability.get(capabilityId);}
 /** A READ declaration is merely eligible for a subsequent native grant,
  * NEVER an automatic grant or proof of successful provider execution.
  */
 findRead(capabilityId:string):BuilderCapability|undefined{
  const capability=this.getCapability(capabilityId);
  return capability?.effect==='READ'?capability:undefined;
 }
}
