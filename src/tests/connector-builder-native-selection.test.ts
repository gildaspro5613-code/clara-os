import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleConnectorReadNames,selectAndExecuteNativeBuilderRead} from '@/lib/connectors/core/native-connector-builder-selection';
import type {AuthorizedConnectorRead} from '@/lib/connectors/core/native-connector-builder-discovery';
import type {BuilderReadSelectionDependencies} from '@/lib/connectors/core/native-connector-builder-selection';

const brevo:AuthorizedConnectorRead={
 provider:'brevo',capabilityId:'brevo.list.read',connectionId:'secret-connection-id',
 revision:1,catalogRevision:2,
};
const github:AuthorizedConnectorRead={
 provider:'github',capabilityId:'github.repository.read',connectionId:'another-secret-connection',
 revision:3,catalogRevision:1,
};
const allowed=[brevo,github];

test('only explicit READ verbs and provider name enable selection',()=>{
 assert.deepEqual(eligibleConnectorReadNames('Clara, liste les listes Brevo.',allowed),['brevo.list.read']);
 assert.deepEqual(eligibleConnectorReadNames('Show me the Github repository.',allowed),['github.repository.read']);
 assert.deepEqual(eligibleConnectorReadNames('Pourquoi Brevo ne fonctionne pas ?',allowed),[]);
 assert.deepEqual(eligibleConnectorReadNames('Supprime un contact Brevo',allowed),[]);
 assert.deepEqual(eligibleConnectorReadNames('Liste Make',allowed),[]);
 assert.deepEqual(eligibleConnectorReadNames('liste les listes',allowed),[]);
 assert.deepEqual(eligibleConnectorReadNames('Brevo: '+ 'a'.repeat(801),allowed),[]);
});

test('selector receives only approved capability IDs, never connection identifiers',async()=>{
 let selected=0,executed=0;
 const deps:BuilderReadSelectionDependencies={
  async select(message,capabilities){
   selected++;
   assert.equal(message,'Liste les listes Brevo');
   assert.deepEqual(capabilities,['brevo.list.read']);
   assert.doesNotMatch(JSON.stringify(capabilities),/secret-connection/);
   return {success:true,responseStatus:'completed',toolCalls:[{
    callId:'read-1',name:'clara_connector_read',
    arguments:JSON.stringify({capabilityId:'brevo.list.read',inputJson:'{"limit":3}'}),
   }]};
  },
  async execute(call){
   executed++;assert.equal(call.name,'brevo.list.read');
   assert.equal(call.arguments,'{"limit":3}');
   return {callId:call.callId,capabilityId:call.name,available:true,
    source:'brevo',content:'{"count":3}'};
  },
 };
 const result=await selectAndExecuteNativeBuilderRead('Liste les listes Brevo',allowed,deps);
 assert.equal(result?.available,true);
 assert.equal(selected,1);assert.equal(executed,1);
});

test('unknown model capability, multiple calls, malformed arguments and missing provider refuse without execute',async()=>{
 let calls=0;
 const bad=[
  {success:true,responseStatus:'completed' as const,toolCalls:[{callId:'1',name:'clara_connector_read',arguments:JSON.stringify({capabilityId:'brevo.email.send',inputJson:'{}'})}]},
  {success:true,responseStatus:'completed' as const,toolCalls:[{callId:'1',name:'clara_connector_read',arguments:'not JSON'}]},
  {success:true,responseStatus:'completed' as const,toolCalls:[{callId:'1',name:'clara_connector_read',arguments:JSON.stringify({capabilityId:'brevo.list.read',inputJson:'{}',token:'x'})}]},
  {success:true,responseStatus:'completed' as const,toolCalls:[{callId:'1',name:'clara_connector_read',arguments:'{}'},{callId:'2',name:'clara_connector_read',arguments:'{}'}]},
  {success:false,responseStatus:'failed' as const,toolCalls:[]},
 ];
 for(const response of bad){
  const result=await selectAndExecuteNativeBuilderRead('Liste les listes Brevo',allowed,{
   async select(){return response;},
   async execute(){calls++;throw Error('NEVER CALLED');},
  });
  assert.equal(result,null);
 }
 assert.equal(calls,0);
});

test('a normal non-connector request costs no cognitive provider call',async()=>{
 let calls=0;
 const output=await selectAndExecuteNativeBuilderRead('Prépare une note de synthèse pour mon client',allowed,{
  async select(){calls++;throw Error('unexpected');},
  async execute(){calls++;throw Error('unexpected');},
 });
 assert.equal(output,null);assert.equal(calls,0);
});
