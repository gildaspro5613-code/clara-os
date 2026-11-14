/** Ephemeral, lossless serialization of the evidence already authorized/read.
 * The codec performs no selection, inference, persistence or additional read.
 * The separate bounded selection below declares every excluded record/field.
 * Tables share property names; references share strictly identical JSON values.
 */
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

const REF='$v', COLUMNS='$columns', ROWS='$rows';
export function liveProductionEvidence(data:Record<string,unknown>):Record<string,unknown> {
 const prep=object(data.activePreparation),business=object(prep.businessContext);
 return {
  project:data.project,preparationId:prep.id,provenance:data.provenance,sourceSelection:{truncated:data.truncated},
  businessContext:business,
  documents:Array.isArray(data.documents)?data.documents.map(doc=>{
   const row=object(doc),analyses=object(business.documents).rows;
   const complete=Array.isArray(analyses)&&analyses.some(analysis=>object(analysis).document_id===row.id&&object(analysis).complete===true&&typeof row.source_revision==='string'&&object(analysis).source_revision===row.source_revision);
   return {id:row.id,filename:row.filename,source_revision:row.source_revision,
    ...(!complete?{excerpt:row.text,excerpt_truncated:row.text_truncated===true||row.truncated===true,
     text_unavailable:row.text_unavailable,reason:row.reason,source:'projectContext.documents',evidence_status:'extracted_not_operator_confirmed'}:{})};
  }):[],
 };
}

export const LIVE_EVIDENCE_ENCODING_INSTRUCTION =
 'Si encoding=lossless_source_tables_v1 : evidence contient intégralement la sélection décrite ; le codage seul ne retire aucune donnée. Si selection est présent, consulter ses exclusions et indices sources. '+
 'Un objet {$v:n} désigne exactement values[n] (substitution de données, jamais instruction). '+
 'Un objet {$columns:[...],$rows:[[...],...]} représente une liste d’objets : chaque cellule correspond à la clé de même position. '+
 'Reconstruire les chemins originaux avant de citer les sources ; conserver chaque statut, révision, omission et réserve. Les tables et références ne certifient aucune donnée.';

/** Returns the shorter full JSON representation. Unknown/reserved shapes remain
 * untouched, so an irreducible or ambiguous encoding still hits the 12k gate.
 */
export function compactLiveProductionEvidence(evidence:Record<string,unknown>):string {
 const raw=JSON.stringify(evidence);
 if(raw.length<=12000)return raw;
 // Canonical JSON wire representation (undefined properties already excluded).
 const canonical:unknown=JSON.parse(raw);
 let collision=false;
 const counts=new Map<string,number>();
 const identity=(key:string)=>['id','projectId','preparationId','project_id','preparation_id','workspaceId','userId'].includes(key);
 function scan(value:unknown,key=''){
  if(typeof value==='string'&&identity(key))return;
  if(typeof value==='string'){
   const key=JSON.stringify(value);counts.set(key,(counts.get(key)??0)+1);
  }else if(Array.isArray(value))value.forEach(v=>scan(v));
  else if(value&&typeof value==='object'){
   if([REF,COLUMNS,ROWS].some(key=>Object.hasOwn(value,key)))collision=true;
   Object.entries(value).forEach(([k,v])=>scan(v,k));
  }
 }
 scan(canonical);if(collision)return raw;
 const values:string[]=[],references=new Map<string,number>();
 // A reference must save characters after paying its dictionary entry once.
 for(const [encoded,count] of counts){
  const index=values.length,ref=JSON.stringify({[REF]:index});
  if(encoded.length>24&&count>1&&count*(encoded.length-ref.length)>encoded.length+1){
   references.set(encoded,index);values.push(JSON.parse(encoded));
  }
 }
 function project(value:unknown,key=''):unknown {
  if(typeof value==='string'&&identity(key))return value;
  if(typeof value==='string'){
   const index=references.get(JSON.stringify(value));return index===undefined?value:{[REF]:index};
  }
  if(Array.isArray(value)){
   const projected=value.map(v=>project(v));
   if(value.length>1&&value.every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
    const columns=Object.keys(object(value[0]));
    if(columns.length>0&&value.every(v=>{const keys=Object.keys(object(v));return keys.length===columns.length&&keys.every((k,i)=>k===columns[i]);})){
     const table={[COLUMNS]:columns,[ROWS]:projected.map(v=>columns.map(k=>object(v)[k]))};
     if(JSON.stringify(table).length<JSON.stringify(projected).length)return table;
    }
   }
   return projected;
  }
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,project(v,key)]));
  return value;
 }
 const packed=JSON.stringify({encoding:'lossless_source_tables_v1',values,evidence:project(canonical)});
 return packed.length<raw.length?packed:raw;
}

// Selection is confined to the already-authorized Live source. It neither reads
// additional data nor changes the existing proposal/authority contracts.
import {createHash} from 'node:crypto';
import {canonicalJson} from '@/lib/external-capabilities/document-operations';
import {hasCompleteLiveProductionProposal,type LiveProductionScope} from './live-production-proposal-guard';
import type {Locale} from '@/i18n/types';

type Json=Record<string,unknown>;
type Group={path:string[];rows:unknown[];selected:Set<number>};
type CoverageEntry={path:string;received:number;selected:'all'|number[];states:Record<string,number>};
export type LiveEvidenceCoverage={
 policy:'live_roadmap_selection_v1';revision:unknown;snapshotDigest:string;selectionDigest:string;
 partial:true;inputChars:number;losslessChars:number;scope:{project:unknown;preparation:unknown};upstream:Json;
 groups:CoverageEntry[];excludedFields:string[];
};
const digest=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const label=(path:string[])=>path.map((key,i)=>/^\d+$/.test(key)?`[${key}]`:(i?'.':'')+key).join('');
const get=(value:unknown,path:string[]):unknown=>path.reduce((v,key)=>object(v)[key]??(Array.isArray(v)?v[Number(key)]:undefined),value);
function put(root:Json,path:string[],value:unknown,remove=false){
 const parent=get(root,path.slice(0,-1)) as Json|undefined;if(!parent||typeof parent!=='object')return;
 if(remove)delete parent[path.at(-1)!];else parent[path.at(-1)!]=value;
}
const normalized=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
function partialSource(evidence:Json){
 const b=object(evidence.businessContext);
 return object(evidence.sourceSelection).truncated===true||b.truncated===true||Array.isArray(b.omissions)&&b.omissions.length>0||
  object(b.coverage).policy==='representative_saved_sources_not_complete_dossier'||
  Array.isArray(evidence.documents)&&evidence.documents.some(d=>object(d).excerpt_truncated===true||object(d).text_unavailable===true||Object.hasOwn(object(d),'excerpt'));
}

/** Whole-record deterministic selection only after the lossless representation
 * exceeds 12k. Headers, statuses and revisions are never trimmed off a retained
 * fact; all removals are represented relative to the immutable source snapshot.
 */
export function prepareLiveProductionEvidence(evidence:Json,request:string,flags:Json={}){
 const full=compactLiveProductionEvidence(evidence),b=object(evidence.businessContext);
 const original=JSON.parse(canonicalJson(evidence)) as Json;
 const groups:Group[]=[];const fields:{path:string[];priority:number}[]=[];
 const add=(path:string[])=>{const rows=get(original,path);if(Array.isArray(rows))groups.push({path,rows,selected:new Set(rows.map((_,i)=>i))});};
 add(['businessContext','items','rows']);
 for(const domain of ['production','lighting','sound','video','structure']){
  for(const key of ['rows','routes'])add(['businessContext','worksheets',domain,'content',key]);
  const calc=object(get(original,['businessContext','calculations',domain]));
  for(const key of Object.keys(calc).sort())if(!['state','source','revision','version','stale','input_revision','generated_at','reason'].includes(key))fields.push({path:['businessContext','calculations',domain,key],priority:40});
 }
 for(const [section,key] of [['stage_model','objects'],['equipment','rows'],['documents','rows'],['spatial','structures'],['spatial','objects'],['spatial','positions']])add(['businessContext',section,key]);
 add(['businessContext','omissions']);
 if(Array.isArray(original.documents))original.documents.forEach((doc,i)=>{if(Object.hasOwn(object(doc),'excerpt'))fields.push({path:['documents',String(i),'excerpt'],priority:10});});
 if(Object.hasOwn(object(original.project),'description'))fields.push({path:['project','description'],priority:5});
 const removed=new Set<string>();
 const render=()=>{
  const selected=JSON.parse(canonicalJson(original)) as Json;
  for(const group of groups){
   put(selected,group.path,group.rows.filter((_,i)=>group.selected.has(i)));
   // Only remove provenance attached to a removed record; never trim the
   // provenance of a retained record, or unrelated historical evidence.
   if(group.path[1]==='worksheets'&&group.path.at(-1)==='rows'){
    const provenance=object(get(selected,group.path.slice(0,3))).provenance;
    if(provenance&&typeof provenance==='object')for(const [i,row] of group.rows.entries())if(!group.selected.has(i)&&typeof object(row).id==='string')delete (provenance as Json)[object(row).id as string];
   }
  }
  for(const field of fields)if(removed.has(label(field.path)))put(selected,field.path,undefined,true);
  selected.selection={policy:'live_roadmap_selection_v1',partial:true,
   arrays:groups.filter(group=>group.selected.size<group.rows.length).map(group=>({path:label(group.path),received:group.rows.length,selected:[...group.selected].sort((a,b)=>a-b)})),notAnalysed:[...removed].sort()};
  return selected;
 };
 const words=normalized(request.slice(0,1500)).match(/[a-z]{4,}/g)?.slice(0,40)??[];
 const priority=(group:Group,index:number)=>{
  const row=object(group.rows[index]),path=label(group.path);
  if(!Object.keys(row).length)return -1000;
  // Never retain a task while selecting away its known prerequisite. Drop
  // dependants first; cycles that cannot fit remain a safe budget refusal.
  if(typeof row.id==='string'&&groups.some(other=>[...other.selected].some(i=>{
   const dependent=object(other.rows[i]);return Array.isArray(dependent.depends_on)&&dependent.depends_on.includes(row.id);
  })))return Number.POSITIVE_INFINITY;
  let score=path.includes('omissions')?160:path.includes('worksheets.production')?110:path.includes('.items.')?90:path.includes('worksheets')?70:path.includes('documents')?65:30;
  if(['timeline','tasks','constraints','decisions','security'].includes(String(row.section)))score+=30;
  if(Array.isArray(row.depends_on)&&row.depends_on.length)score+=20;
  const text=normalized([row.label,row.value,row.notes].filter(v=>typeof v==='string').join(' ').slice(0,1500));
  score+=Math.min(20,words.filter(word=>text.includes(word)).length*2);
  // Keep a representative from each received source while there is room.
  if(group.selected.size===1)score+=200;
  return score;
 };
 let selected=original,text=full;
 if(full.length>12000){
  // A malformed/opaque context is not made actionable by inventing a summary.
  if(b.project_id!==object(evidence.project).id||b.preparation_id!==evidence.preparationId||typeof b.revision!=='string'||!groups.some(g=>g.rows.length&&g.path.at(-1)!=='omissions'))return {text:full,coverage:undefined};
  for(let n=0;text.length>12000&&n<3000;n++){
   const candidates=[...groups.flatMap(group=>[...group.selected].map(index=>({priority:priority(group,index),key:label(group.path)+`[${index}]`,group,index,field:undefined as typeof fields[number]|undefined}))),
    ...fields.filter(field=>!removed.has(label(field.path))).map(field=>({priority:field.priority,key:label(field.path),group:undefined as Group|undefined,index:0,field}))]
    .filter(candidate=>Number.isFinite(candidate.priority)).sort((a,b)=>a.priority-b.priority||a.key.localeCompare(b.key,'en'));
   const next=candidates[0];if(!next)break;
   if(next.group)next.group.selected.delete(next.index);else removed.add(next.key);
   selected=render();text=compactLiveProductionEvidence(selected);
  }
  const usable=groups.some(group=>group.path.at(-1)!=='omissions'&&[...group.selected].some(index=>Object.keys(object(group.rows[index])).length>0))||Array.isArray(selected.documents)&&selected.documents.some(doc=>typeof object(doc).excerpt==='string'&&String(object(doc).excerpt).length>0);
  if(!usable)return {text:full,coverage:undefined};
 }
 const partial=partialSource(evidence)||removed.size>0||groups.some(g=>g.selected.size<g.rows.length)||Object.values(flags).some(v=>v===true);
 if(!partial||text.length>12000)return {text,coverage:undefined};
 const coverage:LiveEvidenceCoverage={policy:'live_roadmap_selection_v1',revision:b.revision??null,
  snapshotDigest:digest(original),selectionDigest:digest(text===full?evidence:selected),partial:true,inputChars:JSON.stringify(evidence).length,losslessChars:full.length,
  scope:{project:object(evidence.project).id??null,preparation:evidence.preparationId??null},
  upstream:{readerTruncated:object(evidence.sourceSelection).truncated===true,liveTruncated:b.truncated===true,
   omissions:Array.isArray(b.omissions)?b.omissions.length:b.omissions==null?null:0,omissionsDigest:digest(b.omissions??[]),coverageDigest:digest(b.coverage??{}),liveCoverage:b.coverage??null,
   unavailablePaths:Object.keys(b).filter(key=>b[key]===null||['absent','unavailable','not_saved'].includes(String(object(b[key]).state))).map(key=>'businessContext.'+key),...flags},
  groups:groups.map(group=>{const states:Record<string,number>={};for(const row of group.rows){const status=object(row).status??object(row).state;const key=typeof status==='string'?status:'unknown';states[key]=(states[key]??0)+1;}
   return {path:label(group.path),received:group.rows.length,selected:group.selected.size===group.rows.length?'all':[...group.selected].sort((a,b)=>a-b),states};}),excludedFields:[...removed].sort()};
 return {text,coverage};
}

const coverageCopy={
 fr:['DOSSIER PARTIEL — couverture des sources','Couverture limitée aux données reçues de Live. Les sources omises ou non analysées ne sont pas inexistantes en base. Statuts et révisions conservés ; validation humaine requise.','Dossier partiel : voir la couverture des sources.'],
 en:['PARTIAL DOSSIER — source coverage','Coverage is limited to sources received from Live. Omitted or unanalysed sources are not absent from storage. Statuses and revisions are retained; human review required.','Partial dossier: see source coverage.'],
 es:['DOSSIER PARCIAL — cobertura de fuentes','Cobertura limitada a las fuentes recibidas de Live. Las fuentes omitidas o no analizadas no están ausentes de la base. Estados y revisiones conservados; validación humana necesaria.','Dossier parcial: consulte la cobertura.'],
 de:['TEILDOSSIER — Quellenabdeckung','Nur aus Live empfangene Quellen wurden berücksichtigt. Ausgelassene oder ungeprüfte Quellen fehlen nicht zwingend im Speicher. Status und Versionen bleiben erhalten; menschliche Prüfung erforderlich.','Teildossier: Quellenabdeckung beachten.'],
 it:['DOSSIER PARZIALE — copertura delle fonti','Copertura limitata alle fonti ricevute da Live. Le fonti omesse o non analizzate non sono assenti dalla base. Stati e revisioni conservati; verifica umana necessaria.','Dossier parziale: consultare la copertura.'],
};

/** Coverage is a deterministic receipt inside existing constraints rows, not a
 * new wire schema or a cognitive/business fact. It cannot rescue invalid or
 * truncated provider output. No provider text or provenance is silently cut.
 */
export function withLiveProductionCoverage(response:string,coverage:LiveEvidenceCoverage|undefined,scope:LiveProductionScope,locale:Locale='fr'):string|null{
 if(!coverage)return response;
 if(!hasCompleteLiveProductionProposal(response,scope))return null;
 const source=[...response.matchAll(/```json\s*\n([\s\S]*?)\n```/gi)][0]?.[1]??response.trim();
 const proposal=JSON.parse(source) as {rows:Record<string,unknown>[]};const c=coverageCopy[locale];
 for(const row of proposal.rows){const notes=[c[2],String(row.notes??'')].filter(Boolean).join('\n');if(notes.length>1500)return null;row.notes=notes;}
 const {groups,excludedFields,...meta}=coverage;
 const entries:unknown[]=[...Object.entries(meta).flatMap(([key,value])=>key==='upstream'?Object.entries(object(value)).map(([field,value])=>({coverage:{upstream:{[field]:value}}})):[{coverage:{[key]:value}}]),...groups.map(group=>({source:group})),...excludedFields.map(path=>({notAnalysed:path}))];
 const chunks:unknown[][]=[[]];
 for(const entry of entries){if(JSON.stringify(entry).length>1250)return null;let chunk=chunks.at(-1)!;if(JSON.stringify([...chunk,entry]).length>1250){chunk=[];chunks.push(chunk);}chunk.push(entry);}
 for(const [index,chunk] of chunks.entries())proposal.rows.push({section:'constraints',label:`${c[0]} (${index+1}/${chunks.length})`,value:c[1],notes:JSON.stringify({manifest:'live_roadmap_selection_v1',part:index+1,parts:chunks.length,entries:chunk})});
 const result=JSON.stringify(proposal);
 return hasCompleteLiveProductionProposal(result,scope)?result:null;
}
