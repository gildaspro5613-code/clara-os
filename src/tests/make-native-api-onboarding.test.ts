import test from 'node:test';
import assert from 'node:assert/strict';
import {
 validateMakeReadConnectionInput,verifyMakeDriveScenarioContract,
 verifyMakeReadConnection,makeNativeDriveCredentials,
} from '@/lib/connectors/make/native-api-onboarding';

const scenarioId=7295042;
const details={scenario:{id:scenarioId,name:'CLARA – Find Drive Document',
 status:'active',isActive:true,scheduling:{type:'on-demand'}}};
const iface={interface:{input:[
 {name:'workspaceId',type:'text',required:true},
 {name:'query',type:'text',required:true},
 {name:'missionId',type:'text',required:false},
 ],output:[{name:'status',type:'text'}]}};
const flow=[
 {id:1,module:'scenario-service:StartSubscenario',mapper:{}},
 {id:2,module:'google-drive:searchForFilesFolders',mapper:{}},
 {id:3,module:'scenario-service:ReturnData',mapper:{}},
];
const blueprint={blueprint:JSON.stringify({flow})};
const input={token:'token-for-test-only-example-12345678',zone:'eu1',scenarioId};

test('onboarding validates exact API-token shape and fixed Make host zone',()=>{
 assert.deepEqual(validateMakeReadConnectionInput(input),input);
 for(const x of [
  {...input,zone:'https://attacker.invalid'},
  {...input,zone:'eu1.make.com@attacker.invalid'},
  {...input,token:'bad\nHeader: Injection'},
  {...input,scenarioId:-1},
  {...input,scenarioId:3.6},
  {...input,provider:'other'},
  {...input,workspaceId:'fake-tenant'},
 ])assert.throws(()=>validateMakeReadConnectionInput(x));
});

test('reviewed Drive scenario is on-demand with the exact read-only module list',()=>{
 assert.equal(verifyMakeDriveScenarioContract(details,iface,blueprint,scenarioId),true);
 assert.equal(verifyMakeDriveScenarioContract(details,iface,{response:blueprint},scenarioId),true);
 for(const value of [
  {blueprint:JSON.stringify({flow:[...flow,{id:4,module:'http:MakeRequest',mapper:{}}]})},
  {blueprint:JSON.stringify({flow:[flow[0],{id:2,module:'google-drive:deleteFile',mapper:{}},flow[2]]})},
  {blueprint:JSON.stringify({flow:[{...flow[0],routes:[]},...flow.slice(1)]})},
 ])assert.equal(verifyMakeDriveScenarioContract(details,iface,value,scenarioId),false);
 assert.equal(verifyMakeDriveScenarioContract(details,iface,blueprint,scenarioId+1),false);
 assert.equal(verifyMakeDriveScenarioContract({scenario:{...details.scenario,isActive:false,status:'inactive'}},iface,blueprint,scenarioId),false);
 assert.equal(verifyMakeDriveScenarioContract(details,{interface:{input:[{name:'query',type:'text',required:true}]}},blueprint,scenarioId),false);
});

test('API onboarding sends only three GET metadata checks and never executes supplier scenario',async()=>{
 const urls:string[]=[];
 const headers:Array<Record<string,string>>=[];
 const expected=[details,iface,blueprint];
 const ok=await verifyMakeReadConnection(input,async (url,init)=>{
  urls.push(String(url));
  assert.equal(init?.method,'GET');
  headers.push(init?.headers as Record<string,string>);
  return new Response(JSON.stringify(expected[urls.length-1]),{status:200});
 });
 assert.equal(ok,true);
 assert.deepEqual(urls,[
  'https://eu1.make.com/api/v2/scenarios/7295042',
  'https://eu1.make.com/api/v2/scenarios/7295042/interface',
  'https://eu1.make.com/api/v2/scenarios/7295042/blueprint?draft=false',
 ]);
 assert.ok(headers.every(h=>h.Authorization==='Token '+input.token));
 assert.ok(urls.every(url=>!url.endsWith('/run')));
 assert.equal(JSON.stringify(makeNativeDriveCredentials(input)).includes('find-drive-document'),true);
});

test('API failures and unverifiable blueprints do not activate the connection',async()=>{
 assert.equal(await verifyMakeReadConnection(input,async()=>new Response('denied',{status:403})),false);
 assert.equal(await verifyMakeReadConnection(input,async()=>new Response('not-json',{status:200})),false);
});
