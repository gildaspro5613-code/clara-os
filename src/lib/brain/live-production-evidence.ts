/** Ephemeral, lossless serialization of the evidence already authorized/read.
 * No selection, truncation, inference, persistence or additional source read.
 * Tables share property names; references share strictly identical JSON values.
 */
import {object} from './live-project-context';

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
 'Si encoding=lossless_source_tables_v1 : evidence contient les sources intégrales transmises, sans sélection supplémentaire. '+
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
