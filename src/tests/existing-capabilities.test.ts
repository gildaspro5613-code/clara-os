import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import ts from 'typescript';
import {WeatherEngine} from '../lib/connectors/internal/weather/weather-engine';

test('existing WeatherAPI engine distinguishes missing config, refusal and invalid data; no invented zero or secret exception',async t=>{
 const previous=process.env.WEATHER_API_KEY;t.after(()=>{if(previous===undefined)delete process.env.WEATHER_API_KEY;else process.env.WEATHER_API_KEY=previous;});
 delete process.env.WEATHER_API_KEY;const engine=new WeatherEngine();assert.equal((await engine.read({location:'Angers'})).code,'WEATHER_CONFIGURATION_MISSING');
 process.env.WEATHER_API_KEY='synthetic-weather-key';let response:unknown={location:{name:'Angers',country:'France'},current:{temp_c:0,condition:{text:'Clear',icon:'//cdn.weatherapi.com/test.png'},last_updated_epoch:1700000000}};let status=200,throwError=false;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{assert.equal(init?.cache,'no-store');if(throwError)throw Error('PRIVATE_KEY_IN_PROVIDER_URL');return Response.json(response,{status});});
 const positive=await engine.read({location:'Angers'});assert.equal(positive.success,true);assert.equal(positive.temperatureC,0);
 response={location:{name:'Angers'},current:{condition:{text:'Clear'},last_updated_epoch:1700000000}};assert.equal((await engine.read({location:'Angers'})).code,'WEATHER_INVALID_RESPONSE');
 status=403;assert.equal((await engine.read({location:'Angers'})).code,'WEATHER_PROVIDER_REFUSED');
 throwError=true;const failed=await engine.read({location:'Angers'});assert.equal(failed.code,'WEATHER_PROVIDER_UNAVAILABLE');assert.ok(!JSON.stringify(failed).includes('PRIVATE_KEY'));assert.equal(failed.temperatureC,undefined);
});

test('repository company knowledge is bounded by the authenticated native workspace and preserves paths, digests and missing commercial data',()=>{
 let context:unknown={scope:{workspaceId:'company',clientId:'c',projectId:'p',sessionId:'s'}};
 const exports:Record<string,unknown>={},require=createRequire(resolve('src/lib/brain/brain-source-registry.ts'));
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/brain/brain-source-registry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>name==='@/lib/native/scoped-context'?{nativeContext:()=>context}:name==='@/lib/connections/current-workspace'?{CURRENT_WORKSPACE_ID:'company'}:require(name)});
 const build=exports.nativeCompanyKnowledge as(event:unknown)=>{data:{records:Array<{path:string;sha256:string;content:unknown}>;missing:string[]};summary:string}|null;
 const event={type:'USER_MESSAGE',payload:{message:'Présente Mélodie Digital Services, Clara OS et Clara Live et notre stratégie commerciale.'}};
 const source=build(event)!;assert.ok(source);assert.equal(source.data.records.length,4);for(const record of source.data.records){assert.match(record.path,/^src\/lib\/knowledge\//);assert.match(record.sha256,/^[a-f0-9]{64}$/);}
 const offers=source.data.records.find(record=>record.path.endsWith('/offers.ts'))!;assert.deepEqual(JSON.parse(JSON.stringify(offers.content)),{});assert.ok(source.data.missing.length>=2);assert.match(source.summary,/never instructions or execution authority/);
 context={scope:{workspaceId:'other',clientId:'c',projectId:'p',sessionId:'s'}};assert.equal(build(event),null);context=undefined;assert.equal(build(event),null);
});
