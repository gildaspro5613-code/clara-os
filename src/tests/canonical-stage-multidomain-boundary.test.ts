import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as core} from '@/app/api/core/canonical/stage/route';

test('unimplemented multidomain capabilities cannot reach SQL or Live through the current Stage route',async(t)=>{
 const keys=['CLARA_EXTERNAL_PRODUCTS_JSON','CLARA_LIVE_PRODUCT_TOKEN','CLARA_LIVE_WORKSPACE_ID','CLARA_LIVE_CAPABILITIES'] as const;
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 t.after(()=>{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}});
 delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;process.env.CLARA_LIVE_PRODUCT_TOKEN='synthetic-multidomain-boundary';process.env.CLARA_LIVE_WORKSPACE_ID='w';
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('No outbound transport authorized');});
 const request=()=>new Request('https://os.fixture.example/api/core/canonical/stage',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic-multidomain-boundary','x-clara-product':'clara-live'},body:JSON.stringify({action:'claim',workspaceId:'w',decisionId:'unissued'})});
 for(const domain of ['sound','video','structure','production']){
  process.env.CLARA_LIVE_CAPABILITIES=JSON.stringify(['canonical-links:v1',`stage:${domain}:mutate:v1`]);
  assert.equal((await core(request())).status,403,domain+' must not inherit Light authority');
 }
 assert.equal(calls,0);
});
