'use client';
import {useEffect,useState} from 'react';
import {useTranslations,useLocale} from 'next-intl';
import type {MailboxCommunicationDraft} from '@/lib/acquisition/mailbox-communication-draft';
type Connection={id:string;address:string;owned:boolean};
type Message={id:string;subject:string;from:string;quarantined:boolean;triage:{priority:'high'|'normal'|'low'|'quarantine';category:string;reason:string;requiresAttention:boolean}};
type OpenMail={subject:string;from:string;text:string;quarantined:boolean;attachments:Array<{id:string;name:string;size:number}>};
type Operation={id:string;state:string};
type Review={from:string;to:string[];subject:string;text:string;attachments:Array<{name:string;sha256:string}>};
export default function NativeMailPanel({referencesOnly=false}:{referencesOnly?:boolean}){
 const t=useTranslations('ui'),locale=useLocale();
 const [loading,setLoading]=useState(true),[mailboxLoaded,setMailboxLoaded]=useState(false);
 const [connections,setConnections]=useState<Connection[]>([]),[connectionId,setConnection]=useState(''),[folders,setFolders]=useState<string[]>([]),[folder,setFolder]=useState(''),[messages,setMessages]=useState<Message[]>([]),[messageId,setMessage]=useState(''),[opened,setOpened]=useState<OpenMail|null>(null),[draft,setDraft]=useState<MailboxCommunicationDraft|null>(null),[operations,setOperations]=useState<Operation[]>([]),[review,setReview]=useState<{id:string;envelope:Review}|null>(null),[approval,setApproval]=useState<{id:string;token:string}|null>(null),[delegate,setDelegate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;void fetch('/api/native/mail',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok||!b.success)throw Error();if(active)setConnections(b.connections);}).catch(()=>{if(active)setError(t('mailUnavailable'));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[t]);
 const setupStrings:Record<string,{title:string;intro:string;address:string;password:string;confirm:string;save:string;success:string;failure:string;disabled:string}>={
 fr:{title:'Connecter la boîte Clara (IONOS)',intro:'Réservé au propriétaire. Mot de passe chiffré sur le serveur ; aucun envoi automatique.',address:'Adresse email',password:'Mot de passe IONOS',confirm:"J’autorise l’enregistrement sécurisé de cette boîte, sans envoi automatique.",save:'Enregistrer la connexion IONOS',success:'Identifiants enregistrés. La réception IMAP doit encore être vérifiée.',failure:'Connexion non enregistrée. Vérifiez les droits ou contactez l’administrateur.',disabled:'La connexion IONOS doit encore être activée par l’administrateur.'},
 en:{title:'Connect Clara mailbox (IONOS)',intro:'Owner only. Password encrypted on the server; no automatic sending.',address:'Email address',password:'IONOS password',confirm:'I authorize securely saving this mailbox without automatic sending.',save:'Save IONOS connection',success:'Credentials saved. IMAP reception still needs verification.',failure:'Connection not saved. Check permissions or contact the administrator.',disabled:'IONOS connection needs administrator activation.'},
 es:{title:'Conectar buzón Clara (IONOS)',intro:'Solo propietario. Contraseña cifrada en el servidor; sin envíos automáticos.',address:'Correo electrónico',password:'Contraseña IONOS',confirm:'Autorizo guardar este buzón de forma segura, sin envíos automáticos.',save:'Guardar conexión IONOS',success:'Credenciales guardadas. Falta verificar la recepción IMAP.',failure:'No se guardó la conexión. Compruebe los permisos.',disabled:'El administrador debe activar la conexión IONOS.'},
 de:{title:'Clara-Postfach verbinden (IONOS)',intro:'Nur für Eigentümer. Passwort serverseitig verschlüsselt; kein automatischer Versand.',address:'E-Mail-Adresse',password:'IONOS-Passwort',confirm:'Ich erlaube die sichere Speicherung ohne automatischen Versand.',save:'IONOS-Verbindung speichern',success:'Zugangsdaten gespeichert. IMAP-Empfang muss noch geprüft werden.',failure:'Verbindung nicht gespeichert. Berechtigungen prüfen.',disabled:'IONOS-Verbindung muss administrativ freigeschaltet werden.'},
 it:{title:'Collega la casella Clara (IONOS)',intro:'Solo proprietario. Password cifrata sul server; nessun invio automatico.',address:'Indirizzo email',password:'Password IONOS',confirm:'Autorizzo il salvataggio sicuro senza invio automatico.',save:'Salva connessione IONOS',success:'Credenziali salvate. La ricezione IMAP deve essere verificata.',failure:'Connessione non salvata. Controllare le autorizzazioni.',disabled:'La connessione IONOS deve essere abilitata dall’amministratore.'}
 };
 const setupText=setupStrings[locale]??setupStrings.fr;
 const ionosAddresses=['clara@melodie.digital','gildas@melodie.digital','contact@melodie.digital','info@melodie.digital','support@melodie.digital'];
 const [setupAddress,setSetupAddress]=useState('clara@melodie.digital');
 const availableIonosAddresses=ionosAddresses.filter(a=>!connections.some(c=>c.address===a));
 const selectedSetupAddress=availableIonosAddresses.includes(setupAddress)?setupAddress:(availableIonosAddresses[0]??'');
 const [setupPassword,setSetupPassword]=useState('');
 const [setupConfirmed,setSetupConfirmed]=useState(false);
 const [setupBusy,setSetupBusy]=useState(false);
 const [setupResult,setSetupResult]=useState('');
 const [setupError,setSetupError]=useState('');
 async function connectClaraMailbox(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(setupBusy||!setupConfirmed||!setupPassword||!selectedSetupAddress)return;
  setSetupBusy(true);setSetupError('');setSetupResult('');
  try{
   const r=await fetch('/api/native/mail/setup',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({address:selectedSetupAddress,password:setupPassword,confirmed:true})});
   const response=await r.json();
   if(!r.ok||!response.success)throw new Error(response.code||'MAIL_SETUP_FAILED');
   setSetupPassword('');setSetupConfirmed(false);
      setSetupResult(setupText.success);
   const list=await fetch('/api/native/mail',{cache:'no-store'});
   if(list.ok){const updated=await list.json();if(updated.success&&Array.isArray(updated.connections))setConnections(updated.connections);}
  }catch(err){
   const code=err instanceof Error?err.message:'MAIL_SETUP_FAILED';
   setSetupError(code==='MAIL_PROVISIONING_NOT_ENABLED'?setupText.disabled:setupText.failure);
  }finally{setSetupBusy(false);}
 }
 const owned=connections.find(c=>c.id===connectionId)?.owned;
 const [savedDraft,setSavedDraft]=useState<MailboxCommunicationDraft|null>(null);
 const draftDirty=!!draft&&(!savedDraft||JSON.stringify({subject:draft.subject,body:draft.body,recipients:draft.recipients,attachmentIds:draft.attachmentIds})!==JSON.stringify({subject:savedDraft.subject,body:savedDraft.body,recipients:savedDraft.recipients,attachmentIds:savedDraft.attachmentIds}));
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [contactName,setContactName]=useState(''),[contactEmail,setContactEmail]=useState('');
 async function get(action:string,extra:Record<string,string>={}){const r=await fetch('/api/native/mail?'+new URLSearchParams({action,connectionId,...extra}),{cache:'no-store'}),b=await r.json();if(!r.ok||!b.success)throw Error();return b;}
 async function post(action:string,extra:Record<string,unknown>={}){const r=await fetch('/api/native/mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,connectionId,...extra})}),b=await r.json();if(!r.ok)throw Error();return b;}
 async function perform(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch{setError(t('mailUnavailable'));}finally{setBusy(false);}}
 async function refresh(){
  setMailboxLoaded(false);setMessages([]);setNextCursor(null);setOpened(null);setMessage('');setOperations([]);setDraft(null);setSavedDraft(null);
  const [list,ops,d]=await Promise.allSettled([get('messages'),get('operations'),get('draft')]);
  if(list.status==='fulfilled'){setMessages(list.value.messages);setNextCursor(list.value.nextCursor);setMailboxLoaded(true);}
  if(ops.status==='fulfilled')setOperations(ops.value.operations);
  if(d.status==='fulfilled'){setDraft(d.value.draft);setSavedDraft(d.value.draft);}
  if([list,ops,d].some(r=>r.status==='rejected'))setError(t('mailUnavailable'));
 }
 return <section aria-label={t('mailTitle')} aria-busy={loading||busy} className="native-panel my-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-white">
 <h2 className="font-semibold">{t('mailTitle')}</h2><p className="my-2 text-white/60">{t('mailIsolation')}</p>
 {loading&&<p role="status">{t('uiLoading')}</p>}
 {!loading&&!error&&connections.length===0&&<p role="status" className="my-4 rounded-xl border border-white/10 p-4 text-slate-300">{t('uiMailEmpty')}</p>}
 {!referencesOnly&&!loading&&connections.length<ionosAddresses.length&&<details className="my-4 rounded-xl border border-white/10 p-4">
  <summary className="cursor-pointer font-semibold">{setupText.title}</summary>
  <p className="my-3 text-white/70">{setupText.intro}</p>
  <form onSubmit={e=>void connectClaraMailbox(e)} autoComplete="off" className="flex max-w-lg flex-col gap-3">
   <label className="flex flex-col gap-1">{setupText.address}<select className="rounded-lg border border-white/20 bg-slate-900 p-2" value={selectedSetupAddress} disabled={setupBusy} onChange={e=>{setSetupAddress(e.target.value);setSetupPassword("");setSetupConfirmed(false);setSetupError("");setSetupResult("");}}>{availableIonosAddresses.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
   <label className="flex flex-col gap-1">{setupText.password}<input type="password" name="ionos-password" autoComplete="new-password" className="rounded-lg border border-white/20 bg-slate-900 p-2" value={setupPassword} required disabled={setupBusy} onChange={e=>setSetupPassword(e.target.value)}/></label>
   <label className="flex items-start gap-2"><input type="checkbox" checked={setupConfirmed} disabled={setupBusy} onChange={e=>setSetupConfirmed(e.target.checked)}/>{setupText.confirm}</label>
   <button className="rounded-lg border border-cyan-500/60 p-2 disabled:opacity-50" disabled={setupBusy||!setupPassword||!setupConfirmed}>{setupText.save}</button>
  </form>
  {setupError&&<p role="alert" className="mt-3 text-amber-300">{setupError}</p>}
  {setupResult&&<p role="status" className="mt-3 text-cyan-200">{setupResult}</p>}
 </details>}
 <label>{t('mailAccount')} <select aria-label={t('mailAccount')} className="bg-slate-900" value={connectionId} disabled={busy} onChange={e=>{setConnection(e.target.value);setMailboxLoaded(false);setNextCursor(null);setFolder('');setFolders([]);setMessages([]);setOpened(null);setMessage('');setDraft(null);setSavedDraft(null);setOperations([]);setReview(null);setApproval(null);}}><option value="">{t('choose')}</option>{connections.map(c=><option key={c.id} value={c.id}>{c.address}</option>)}</select></label>
 <button className="m-2 border p-2" disabled={busy||!connectionId} onClick={()=>void perform(refresh)}>{t('mailRefresh')}</button>
 {!loading&&!error&&connections.length>0&&!connectionId&&<p role="status" className="my-3 text-white/65">{t('mailChooseAuthorized')}</p>}
 {mailboxLoaded&&!error&&messages.length===0&&<p role="status" className="my-3 text-white/65">{t('mailCachedEmpty')}</p>}
 {!referencesOnly&&<>
 <button className="m-2 border p-2" disabled={busy||!connectionId} onClick={()=>void perform(async()=>{setFolders((await get('folders')).folders);})}>{t('mailFolders')}</button>
 <select aria-label={t('mailFolder')} className="bg-slate-900" value={folder} onChange={e=>setFolder(e.target.value)}><option value="">{t('mailFolder')}</option>{folders.map(f=><option key={f}>{f}</option>)}</select>
 <button className="m-2 border p-2" disabled={busy||!owned||!folder} onClick={()=>void perform(async()=>{await post('sync',{folder});await refresh();})}>{t('mailSync')}</button>
 <p className="mt-2">{t('mailContextHelp')}</p>
 <ul>{messages.map(m=><li className="my-2" key={m.id}><span className="mr-2 text-xs" aria-label={t('mailTriage_'+m.triage.priority)}>{t('mailTriage_'+m.triage.priority)}</span><button disabled={busy||m.quarantined} onClick={()=>void perform(async()=>{setOpened((await get('message',{messageId:m.id})).message);setMessage(m.id);setReview(null);setApproval(null);})}>{m.from} · {m.subject}{m.quarantined?' · '+t('mailQuarantine'):''}</button></li>)}</ul>
 {nextCursor&&<button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{const page=await get('messages',{beforeId:nextCursor});setMessages(previous=>[...previous,...page.messages.filter((m:Message)=>!previous.some(p=>p.id===m.id))]);setNextCursor(page.nextCursor);})}>{t('mailMore')}</button>}
 {opened&&<article className="my-3 rounded border border-white/10 p-3"><h3>{opened.subject}</h3><pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-sans leading-7">{opened.text}</pre><ul>{opened.attachments.map(a=><li key={a.id}><a href={'/api/native/mail?'+new URLSearchParams({action:'attachment',connectionId,messageId,attachmentId:a.id})}>{a.name} · {a.size}</a></li>)}</ul>
 {<fieldset className="my-3 border p-2"><legend>{t('mailContactReview')}</legend><label>{t('mailContactName')} <input disabled={busy} aria-label={t('mailContactName')} className="bg-slate-900" value={contactName} onChange={e=>setContactName(e.target.value)}/></label><label>{t('mailContactEmail')} <input disabled={busy} aria-label={t('mailContactEmail')} className="bg-slate-900" value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/></label><button disabled={busy||!contactName||!contactEmail} onClick={()=>void perform(async()=>{await post('createContact',{messageId,name:contactName,email:contactEmail,locale});location.reload();})}>{t('mailCreateContact')}</button></fieldset>}
 <button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{await post('bind',{messageId});location.reload();})}>{t('mailBind')}</button>
 <button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{const d=await post('prepare',{messageId,locale});setDraft(d.draft);setSavedDraft(d.draft);setApproval(null);})}>{t('mailPrepare')}</button></article>}
 {draft&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{const saved=(await post('save',{messageId:draft.messageId,subject:draft.subject,body:draft.body,recipients:draft.recipients,attachmentIds:draft.attachmentIds})).draft;setDraft(saved);setSavedDraft(saved);setApproval(null);setReview(null);});}}>
 <p>{t('mailFrom')}: {draft.sender.email} · {t('nativeDocumentRevision')} {draft.revision}</p>
 <label className="block">{t('mailTo')}<input disabled={busy} aria-label={t('mailTo')} className="block w-full bg-slate-900" value={draft.recipients.join(', ')} onChange={e=>{setDraft({...draft,recipients:e.target.value.split(',').map(x=>x.trim())});setApproval(null);}}/></label>
 <label className="block">{t('mailSubject')}<input disabled={busy} aria-label={t('mailSubject')} className="block w-full bg-slate-900" value={draft.subject} onChange={e=>{setDraft({...draft,subject:e.target.value});setApproval(null);}}/></label>
 <label className="block">{t('mailBody')}<textarea disabled={busy} aria-label={t('mailBody')} className="block min-h-32 w-full bg-slate-900" value={draft.body} onChange={e=>{setDraft({...draft,body:e.target.value});setApproval(null);}}/></label>
 {opened?.attachments.map(a=><label key={a.id} className="block"><input disabled={busy} type="checkbox" checked={draft.attachmentIds.includes(a.id)} onChange={e=>{setDraft({...draft,attachmentIds:e.target.checked?[...draft.attachmentIds,a.id]:draft.attachmentIds.filter(id=>id!==a.id)});setApproval(null);}}/>{a.name}</label>)}
 <button className="m-2 border p-2" disabled={busy}>{t('mailSave')}</button>
 <button type="button" className="m-2 border p-2" disabled={busy||draftDirty} onClick={()=>void perform(async()=>{await post('submit');await refresh();setReview(null);setApproval(null);})}>{t('mailSubmit')}</button></form>}
 {owned&&<details className="my-3"><summary>{t("documentAuthoritySettings")}</summary><div className="mt-3 flex flex-wrap gap-2"><label>{t('nativeDelegateUser')} <input className="bg-slate-900" value={delegate} onChange={e=>setDelegate(e.target.value)}/></label>{(['delegate','revokeDelegation'] as const).map(action=><button disabled={busy||!delegate} key={action} onClick={()=>void perform(async()=>{await post(action,{userId:delegate});})}>{t(action==='delegate'?'nativeDelegate':'nativeRevokeDelegate')}</button>)}<button disabled={busy} onClick={()=>void perform(async()=>{await post('revoke');location.reload();})}>{t('mailRevoke')}</button></div></details>}
 </>}
 <ul>{operations.map(op=><li key={op.id} className="my-2"><span>{op.id} · {t('mailState_'+op.state)}</span>{!referencesOnly&&<button className="mx-2 border p-2" disabled={busy||!['pending','approved'].includes(op.state)} onClick={()=>void perform(async()=>{const r=await get('review',{operationId:op.id});setReview({id:op.id,envelope:r.envelope});setApproval(null);})}>{t('mailReview')}</button>}</li>)}</ul>
 {review&&!referencesOnly&&<div className="my-3 border p-3"><p>{t('mailFrom')}: {review.envelope.from}</p><p>{t('mailTo')}: {review.envelope.to.join(', ')}</p><h3>{review.envelope.subject}</h3><pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-sans leading-7">{review.envelope.text}</pre>{review.envelope.attachments.map(a=><p key={a.sha256}>{a.name} · SHA256 {a.sha256}</p>)}<p>{t('mailApprovalHelp')}</p>
 <button className="m-2 border p-2" disabled={busy||!owned} onClick={()=>void perform(async()=>{const b=await post('approve',{operationId:review.id});await refresh();setApproval({id:review.id,token:b.token});})}>{t('mailApprove')}</button>
 <button className="m-2 border p-2" disabled={busy||!owned||approval?.id!==review.id} onClick={()=>void perform(async()=>{const a=approval!;setApproval(null);await post('send',{operationId:a.id,token:a.token});setReview(null);await refresh();})}>{t('mailSend')}</button></div>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
