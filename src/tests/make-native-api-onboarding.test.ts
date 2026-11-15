import test from 'node:test';
import {safeMakeConnectCode,makeHttpConnectFailure} from '@/components/connections/make-connect-error';
import assert from 'node:assert/strict';
import {
 validateMakeReadConnectionInput,verifyMakeDriveScenarioContract,
 verifyMakeReadConnection,verifyMakeReadConnectionDetailed,makeNativeDriveCredentials,
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

test('supplier rejection, scope, missing scenario, rate limit and invalid response have fixed safe codes',async()=>{
 for(const [status,code] of [
  [401,'MAKE_TOKEN_REJECTED'],
  [403,'MAKE_TOKEN_PERMISSION_DENIED'],
  [404,'MAKE_SCENARIO_UNAVAILABLE'],
  [429,'MAKE_PROVIDER_RATE_LIMITED'],
  [502,'MAKE_PROVIDER_UNREACHABLE'],
 ] as const){
  const result=await verifyMakeReadConnectionDetailed(input,async()=>new Response('private-upstream-details',{status}));
  assert.deepEqual(result,{ok:false,code});
  assert.ok(!JSON.stringify(result).includes(input.token));
  assert.ok(!JSON.stringify(result).includes('private-upstream-details'));
 }
 assert.deepEqual(await verifyMakeReadConnectionDetailed(input,async()=>new Response('broken JSON',{status:200})),
  {ok:false,code:'MAKE_PROVIDER_RESPONSE_INVALID'});
 let calls=0;
 const rejected=await verifyMakeReadConnectionDetailed(input,async()=>{
  calls++;
  return new Response(JSON.stringify(calls===1?details:calls===2?iface:
   {blueprint:JSON.stringify({flow:[flow[0],{...flow[1],module:'google-drive:deleteFile'},flow[2]]})}),{status:200});
 });
 assert.deepEqual(rejected,{ok:false,code:'MAKE_SCENARIO_CONTRACT_MISMATCH'});
 assert.equal(calls,3);
});

test('native Make UI never hides a safe unknown server code behind generic text',()=>{
 assert.deepEqual(makeHttpConnectFailure(503,{success:false,code:'NATIVE_AUTHORITY_UNAVAILABLE'}),
  {kind:'http',status:503,code:'NATIVE_AUTHORITY_UNAVAILABLE'});
 assert.deepEqual(makeHttpConnectFailure(403,{success:false,code:'REGISTRY_ACCESS_DENIED'}),
  {kind:'http',status:403,code:'REGISTRY_ACCESS_DENIED'});
 assert.deepEqual(makeHttpConnectFailure(422,{success:false,code:'MAKE_SCENARIO_CONTRACT_MISMATCH'}),
  {kind:'http',status:422,code:'MAKE_SCENARIO_CONTRACT_MISMATCH'});
 assert.deepEqual(makeHttpConnectFailure(502,'Not JSON'),{kind:'http',status:502,code:null});
 for(const secret of ['private-credential-value','MAKE_test-raw-message with spaces',{}])
  assert.equal(safeMakeConnectCode(secret),null);
});
