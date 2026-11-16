import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {incident276} from './helpers/production-276-fixture';
import {EventType} from '@/types';
import {liveProjectSource} from '@/lib/brain/live-project-context';
import {liveProductionEvidence,compactLiveProductionEvidence,prepareLiveProductionEvidence,withLiveProductionCoverage} from '@/lib/brain/live-production-evidence';
import {canonicalJson} from '@/lib/external-capabilities/document-operations';
import {composeClaraResponseWithProposal} from '@/lib/brain/response-composer';
import {createSession} from '@/lib/core/session';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';
import {hasCompleteLiveProductionProposal} from '@/lib/brain/live-production-proposal-guard';
import {reasoning} from '@/lib/brain/reasoning';
import {buildContext} from '@/lib/brain/context';
const scope={projectId:'A',preparationId:'prep-A'};
function source(scale=1){const wire=incident276(scale);return {wire,source:liveProjectSource({id:'276-'+scale,type:EventType.USER_MESSAGE,source:'EXTERNAL_PRODUCT',timestamp:new Date(),context:wire.scope,payload:wire})!};}
const answer=()=>JSON.stringify({schema:'clara.production.proposal.v1',project_id:'A',preparation_id:'prep-A',rows:[{section:'tasks',label:'Arbitrer le chevauchement documenté',value:'Montage 09:00–12:00 et réglages 11:00–13:00 pour la même équipe plateau : arbitrer avant validation, sans déplacer les horaires.',notes:'load/focus, statut to_verify, doc1 ; proposition synthétique non validée.'}]});
const completed=(content=answer())=>({success:true,responseStatus:'completed' as const,content,message:'SIMULATED PROVIDER',completedAt:new Date()});
function expand(text:string):Record<string,unknown>{const packed=JSON.parse(text);if(packed.encoding!=='lossless_source_tables_v1')return packed;function decode(value:unknown):unknown{if(Array.isArray(value))return value.map(decode);if(value&&typeof value==='object'){const v=value as Record<string,unknown>;if(Object.keys(v).length===1&&Object.hasOwn(v,'$v'))return packed.values[v.$v as number];if(Object.hasOwn(v,'$columns'))return (v.$rows as unknown[][]).map(row=>Object.fromEntries((v.$columns as string[]).map((key,i)=>[key,decode(row[i])])));return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,decode(v)]));}return value;}return decode(packed.evidence) as Record<string,unknown>;}
const at=(root:unknown,path:string):unknown=>path.split('.').reduce((v,key)=>(v as Record<string,unknown>)?.[key],root);

test('276: baseline fixture reproduces the published dimensions and exceeds the old lossless 12k gate',()=>{
 const {wire,source:current}=source();const b=wire.context.activePreparation.businessContext;
 assert.equal(JSON.stringify(wire).length,16239);assert.equal(JSON.stringify(b).length,10853);assert.equal(JSON.stringify(wire.context.projectContext.documents).length,2990);assert.equal(JSON.stringify(b.omissions).length,3627);assert.equal(b.omissions.length,40);
 const old=compactLiveProductionEvidence(liveProductionEvidence(current.data as Record<string,unknown>));assert.ok(old.length>12000);
 const baseline=JSON.parse(readFileSync('docs/reception/issue-276/baseline.json','utf8'));assert.equal(baseline.generation.failureCategory,'source_context_budget');assert.equal(baseline.providerCalls,0);
});

test('276: retained facts, statuses, revisions, provenance and source indices survive selection unchanged',()=>{
 const {wire,source:current}=source(4);const evidence=liveProductionEvidence(current.data as Record<string,unknown>),before=canonicalJson(evidence);
 const selected=prepareLiveProductionEvidence(evidence,wire.message);assert.ok(selected.coverage);assert.ok(selected.text.length<=12000);assert.equal(canonicalJson(evidence),before);
 const decoded=expand(selected.text);
 for(const group of selected.coverage.groups){const rows=at(evidence,group.path) as unknown[],indices=group.selected==='all'?rows.map((_,i)=>i):group.selected;assert.deepEqual(at(decoded,group.path),indices.map(i=>rows[i]),group.path);}
 const originalTasks=at(evidence,'businessContext.worksheets.production.content.rows') as {id:string;depends_on?:string[]}[];
 const tasks=at(decoded,'businessContext.worksheets.production.content.rows') as typeof originalTasks;
 for(const row of tasks)for(const dependency of row.depends_on??[])if(originalTasks.some(original=>original.id===dependency))assert.ok(tasks.some(selected=>selected.id===dependency));
 const b=at(evidence,'businessContext') as Record<string,unknown>,actual=at(decoded,'businessContext') as Record<string,unknown>;
 assert.equal(actual.revision,b.revision);assert.equal(selected.coverage.snapshotDigest,createHash('sha256').update(before).digest('hex'));assert.equal(selected.coverage.selectionDigest,createHash('sha256').update(canonicalJson(decoded)).digest('hex'));
 for(const domain of ['production','sound','video','structure'])for(const key of ['version','base_revision','stale','state'])assert.deepEqual(at(decoded,'businessContext.worksheets.'+domain+'.'+key),at(evidence,'businessContext.worksheets.'+domain+'.'+key));
 assert.ok(selected.coverage.groups.some(g=>g.selected!=='all'));assert.ok(selected.coverage.excludedFields.includes('documents[0].excerpt'));
});

for(const scale of [1,2,4,8,16])test(`276: increasing dossier x${scale} is bounded, partial and one simulated composition call`,async(t)=>{
 const {wire,source:current}=source(scale);const session=createSession();session.sources=[current];let calls=0;
 assert.ok(JSON.stringify(current.data).length<=32000);
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(input)=>{calls++;assert.equal(input.maxTokens,5200);assert.equal(input.outputProfile,'live_production');assert.equal(input.reasoningEffort,'low');const text=input.prompt.split('SOURCES DISPONIBLES (non certifiées)\n').at(-1)!;assert.ok(text.length<=12000);assert.match(text,/load/);assert.match(text,/focus/);assert.match(input.prompt,/value max 850/);return completed();});
 const composed=await composeClaraResponseWithProposal(wire.message,session,'fr',scope);assert.equal(composed.generation.status,'completed');assert.equal(calls,1);assert.equal(hasCompleteLiveProductionProposal(composed.content,scope),true);
 const proposal=JSON.parse(composed.content);assert.match(proposal.rows[0].value,/09:00/);assert.match(proposal.rows[0].notes,/Dossier partiel/);
 const receipts=proposal.rows.filter((r:{label:string})=>r.label.startsWith('DOSSIER PARTIEL'));
 assert.ok(receipts.length);const entries=receipts.flatMap((r:{notes:string})=>JSON.parse(r.notes).entries);assert.equal(entries.find((e:{coverage?:{revision?:string}})=>e.coverage?.revision)?.coverage.revision,wire.context.activePreparation.businessContext.revision);
 assert.ok(entries.some((entry:{source?:unknown})=>entry.source));assert.equal(composed.physicalAction,undefined);
});

test('276: canonical selection is independent of object-key insertion order',()=>{
 const {wire,source:current}=source(2);const evidence=liveProductionEvidence(current.data as Record<string,unknown>);
 function reverse(v:unknown):unknown{if(Array.isArray(v))return v.map(reverse);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).reverse().map(([k,v])=>[k,reverse(v)]));return v;}
 const a=prepareLiveProductionEvidence(evidence,wire.message),b=prepareLiveProductionEvidence(reverse(evidence) as Record<string,unknown>,wire.message);
 assert.deepEqual(a.coverage,b.coverage);assert.equal(a.text,b.text);
});

test('276: the actual Brain reasoning receives retained planning evidence even when the generic reader drops activePreparation',async(t)=>{
 const {wire,source:current}=source(16);assert.equal((current.data as {truncated:boolean}).truncated,true);
 const prompts:string[]=[];
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(input)=>{prompts.push(input.prompt);assert.match(input.prompt,/load/);assert.match(input.prompt,/focus/);assert.match(input.prompt,/09:00/);assert.match(input.prompt,/11:00/);assert.match(input.prompt,/selection/);
  return completed(JSON.stringify({intent:'Coordonner le montage',summary:'Arbitrer les créneaux de la même équipe plateau',confidence:.8,entities:['load','focus'],actions:['Soumettre le conflit à la régie'],nextAction:'Arbitrer sans changer les horaires',importance:.8,urgency:.7,impact:.8}));});
 const event={id:'large-brain',type:EventType.USER_MESSAGE,source:'EXTERNAL_PRODUCT',timestamp:new Date(),context:wire.scope,payload:wire};
 const result=await reasoning(buildContext(event),{shortTerm:[],longTerm:[],facts:[]},[current]);
 assert.equal(prompts.length,1);assert.match(result.summary,/plateau/);assert.equal(result.actions.length,1);
});

test('276: PostgreSQL JSONB key ordering cannot remove identity, revision or planning prerequisites before selection',()=>{
 const wire=incident276(16);
 function reordered(value:unknown):unknown{if(Array.isArray(value))return value.map(reordered);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.length-b.length||a.localeCompare(b,'en')).map(([key,value])=>[key,reordered(value)]));return value;}
 const event={id:'jsonb-order',type:EventType.USER_MESSAGE,source:'EXTERNAL_PRODUCT',timestamp:new Date(),context:wire.scope,payload:reordered(wire)};
 const actual=liveProjectSource(event)!;const prepared=(actual.data as {productionEvidence:{text:string;coverage:{revision:string}}}).productionEvidence;
 assert.ok(prepared);assert.ok(prepared.text.length<=12000);assert.equal(prepared.coverage.revision,wire.context.activePreparation.businessContext.revision);
 for(const fact of ['09:00','12:00','11:00','13:00','load','focus'])assert.ok(prepared.text.includes(fact),fact);
});

test('276: request relevance affects only whole-record selection, never source values',()=>{
 const {source:current}=source();const evidence=liveProductionEvidence(current.data as Record<string,unknown>);const b=evidence.businessContext as Record<string,unknown>;
 b.omissions=[];b.items={rows:Array.from({length:24},(_,i)=>({id:'fact-'+i,section:i%2?'video':'sound',label:i%2?'Vidéo liaison SDI':'Son console microphones',value:createHash('sha256').update('fact-'+i).digest('hex').repeat(6),status:'to_verify'}))};
 const sound=prepareLiveProductionEvidence(evidence,'Son console microphones'),video=prepareLiveProductionEvidence(evidence,'Vidéo liaison SDI');
 assert.notDeepEqual(sound.coverage?.groups.find(g=>g.path==='businessContext.items.rows')?.selected,video.coverage?.groups.find(g=>g.path==='businessContext.items.rows')?.selected);
});

test('276: Live representative coverage is partial even without a size truncation',()=>{
 const evidence={project:{id:'A'},preparationId:'prep-A',businessContext:{project_id:'A',preparation_id:'prep-A',revision:'r1',truncated:false,omissions:[],coverage:{policy:'representative_saved_sources_not_complete_dossier',source_counts:{items:2},selected_counts:{items:2}},items:{rows:[{id:'one',value:'Donnée reçue',status:'to_verify'}]},stage_model:{state:'unavailable'}}};
 const selected=prepareLiveProductionEvidence(evidence,'Planning');assert.ok(selected.coverage);assert.deepEqual(selected.coverage.upstream.liveCoverage,evidence.businessContext.coverage);assert.deepEqual(selected.coverage.upstream.unavailablePaths,['businessContext.stage_model']);
 const result=withLiveProductionCoverage(answer(),selected.coverage,scope)!;assert.match(JSON.parse(result).rows[0].notes,/Dossier partiel/);
});

for(const locale of ['fr','en','es','de','it'] as const)test('276: coverage is explicit in '+locale+' without a new result schema',()=>{
 const {wire,source:current}=source();const selected=prepareLiveProductionEvidence(liveProductionEvidence(current.data as Record<string,unknown>),wire.message);
 const result=withLiveProductionCoverage(answer(),selected.coverage,scope,locale)!;assert.ok(result);assert.equal(hasCompleteLiveProductionProposal(result,scope),true);assert.ok(JSON.parse(result).rows.length>1);
});

for(const content of ['not JSON',answer().slice(0,-2),answer().replace('"project_id":"A"','"project_id":"other"'),JSON.stringify({schema:'clara.production.proposal.v1',project_id:'A',preparation_id:'prep-A',rows:[]})])test('276: coverage never repairs malformed, empty, foreign or truncated JSON '+content.slice(0,18),()=>{
 const {wire,source:current}=source();const selected=prepareLiveProductionEvidence(liveProductionEvidence(current.data as Record<string,unknown>),wire.message);assert.equal(withLiveProductionCoverage(content,selected.coverage,scope),null);
});

test('276: adding coverage never truncates provider notes or exceeds the existing result limits',()=>{
 const {wire,source:current}=source();const {coverage}=prepareLiveProductionEvidence(liveProductionEvidence(current.data as Record<string,unknown>),wire.message);
 const notesLimit=JSON.parse(answer());notesLimit.rows[0].notes='n'.repeat(1500);assert.equal(hasCompleteLiveProductionProposal(JSON.stringify(notesLimit),scope),true);assert.equal(withLiveProductionCoverage(JSON.stringify(notesLimit),coverage,scope),null);
 const rowsLimit=JSON.parse(answer());rowsLimit.rows=Array.from({length:50},()=>({section:'tasks',label:'Donnée de test',value:'À vérifier'}));assert.equal(hasCompleteLiveProductionProposal(JSON.stringify(rowsLimit),scope),true);assert.equal(withLiveProductionCoverage(JSON.stringify(rowsLimit),coverage,scope),null);
});

test('276: even syntactically valid JSON is refused when the provider reports output_truncated',async(t)=>{
 const {wire,source:current}=source();const session=createSession();session.sources=[current];let calls=0;
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>{calls++;return {...completed(),responseStatus:'incomplete' as const,incompleteReason:'max_output_tokens' as const,outputTokens:5200};});
 const result=await composeClaraResponseWithProposal(wire.message,session,'fr',scope);assert.equal(result.generation.failureCategory,'output_truncated');assert.equal(result.generation.status,'incomplete');assert.equal(calls,1);assert.doesNotMatch(result.content,/Arbitrer le chevauchement|clara.production.proposal.v1/);
});

test('276: opaque evidence with no usable fact remains fail-closed; metadata cannot create a proposal',async(t)=>{
 let calls=0;t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>{calls++;return completed();});
 const session=createSession();session.sources=[{source:'clara-live-project',available:true,summary:'Unavailable',data:{project:{id:'A'},activePreparation:{id:'prep-A',businessContext:{project_id:'A',preparation_id:'prep-A',revision:'a'.repeat(64),items:{rows:[{id:'giant',value:'x'.repeat(20000)}]}}}}}];
 assert.equal((await composeClaraResponseWithProposal('Planning',session,'fr',scope)).generation.failureCategory,'source_context_budget');assert.equal(calls,0);
});
