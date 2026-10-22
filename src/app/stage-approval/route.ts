import {randomUUID} from 'node:crypto';
import {readAuthorizedNativeSession, nativeFailure, nativeSelectors} from '@/lib/native/authority';
import {RegistryError} from '@/lib/canonical/registry';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const query=new URL(request.url).searchParams, intentId=query.get('intentId');
 if(!intentId||!/^[a-f0-9]{64}$/.test(intentId))throw new RegistryError(400,'INVALID_STAGE_INTENT');
 const configured=new URL(process.env.CLARA_LIVE_CALLBACK_BASE_URL??'');
 if(configured.protocol!=='https:'||configured.username||configured.password)throw new RegistryError(503,'LIVE_RETURN_ORIGIN_UNAVAILABLE');
 const returnOrigin=query.get('returnOrigin');
 if(returnOrigin!==configured.origin)throw new RegistryError(403,'LIVE_RETURN_ORIGIN_DENIED');
 await readAuthorizedNativeSession(request);const scope=nativeSelectors(request);
 const nonce=randomUUID();
 const data=JSON.stringify({intentId,returnOrigin,workspaceId:scope.workspaceId,projectId:scope.projectId}).replaceAll('<','\\u003c');
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Clara OS · Validation spatiale</title><main><h1>Valider l’implantation Light</h1><p>Vérifiez l’aperçu dans Clara Live. Cette décision autorise uniquement les positions déclarées, sans commande matérielle.</p><p>Workspace : ${escape(scope.workspaceId)} · Projet : ${escape(scope.projectId)}</p><p>La session OS et le droit Light sont vérifiés à chaque approbation. Si l’accès est refusé, contactez l’administrateur ; aucun droit n’est accordé automatiquement.</p><button id="approve">Approuver cette implantation</button><p id="status" role="status"></p></main><script nonce="${nonce}">const context=${data};let busy=false;document.querySelector('#approve').onclick=async()=>{if(busy)return;busy=true;const button=document.querySelector('#approve'),status=document.querySelector('#status');button.disabled=true;try{if(!window.opener)throw Error('Fenêtre Clara Live fermée ; recommencez depuis le projet.');const response=await fetch('/api/native/stage',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',intentId:context.intentId})});const body=await response.json();if(!response.ok||!body.success)throw Error(body.code||'Approbation refusée');const decision=body.data;if(decision.intent.intentId!==context.intentId)throw Error('Intention différente');window.opener.postMessage({type:'clara.stage-decision.v1',intentId:context.intentId,decisionId:decision.decisionId,nonce:decision.nonce},context.returnOrigin);status.textContent='Décision transmise à Clara Live. Vérifiez le reçu de sauvegarde dans le projet.';}catch(error){status.textContent=error.message;button.disabled=false;}finally{busy=false;}};</script></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`}});
 }catch(error){return nativeFailure(error);}}
