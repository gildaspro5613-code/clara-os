/** Explicitly simulated provider, actual reader/reasoning/composer. Test only.
 * Throws if the fixture's conflict is absent from the actual selected prompt.
 * No SDK transport, credentials, external network or business writer is used.
 */
import assert from 'node:assert/strict';
import type {Event} from '@/types';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';
import {liveProjectSource} from '@/lib/brain/live-project-context';
import {composeClaraResponseWithProposal} from '@/lib/brain/response-composer';
import {reasoning} from '@/lib/brain/reasoning';
import {buildContext} from '@/lib/brain/context';

export function production276Reception(){
 const state={mode:'completed',calls:[] as {profile:string;promptChars:number;sourceChars?:number;sourceHasConflict:boolean}[]};
 OpenAIResponsesEngine.prototype.generate=async(input)=>{
  const conflict=['09:00','12:00','11:00','13:00','plateau'].every(word=>input.prompt.includes(word));
  state.calls.push({profile:input.outputProfile??'reasoning',promptChars:input.prompt.length,sourceChars:input.outputProfile==='live_production'?input.prompt.split('SOURCES DISPONIBLES (non certifiées)\n').at(-1)!.length:undefined,sourceHasConflict:conflict});
  assert.equal(conflict,true,'Test fixture conflict missing from the actual cognitive prompt');
  let content:string;
  if(input.outputProfile!=='live_production')content=JSON.stringify({intent:'Coordonner le plateau',summary:'Arbitrer le chevauchement documenté montage/réglages',confidence:.8,entities:['Montage','Réglages'],actions:['Demander un arbitrage humain sans déplacer les horaires'],nextAction:'Arbitrer les ressources plateau',importance:.8,urgency:.7,impact:.8});
  else{
   const schema=JSON.parse(input.prompt.split('Schéma exact : ')[1].split('\n')[0]);
   content=JSON.stringify({...schema,project_id:state.mode==='foreign'?'foreign-project':schema.project_id,
    rows:[{section:'tasks',label:'Arbitrer le chevauchement du plateau',value:'Montage 09:00–12:00 et réglages 11:00–13:00 mobilisent la même équipe plateau. Arbitrage humain requis avant validation ; aucun horaire déplacé.',notes:'Source : planning synthétique transmis ; statut à vérifier. Résultat du fournisseur simulé, sans certification cognitive réelle.'}]});
   if(state.mode==='invalid')content=content.slice(0,-5);
  }
  return {success:true,responseStatus:state.mode==='truncated'&&input.outputProfile==='live_production'?'incomplete':'completed',incompleteReason:state.mode==='truncated'?'max_output_tokens':undefined,outputTokens:state.mode==='truncated'?5200:undefined,content,message:'SIMULATED PROVIDER, NO NETWORK',completedAt:new Date()};
 };
 return {state,compose:composeClaraResponseWithProposal,sourceFactory:async(event:Record<string,unknown>)=>{
  const actual=event as unknown as Event,source=liveProjectSource(actual);
  if(!source)return [];
  await reasoning(buildContext(actual),{shortTerm:[],longTerm:[],facts:[]},[source]);
  return [source];
 }};
}
