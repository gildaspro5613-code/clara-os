'use client';

import {useEffect,useState} from 'react';
import {useLocale} from 'next-intl';
import {ShieldCheck,LockKeyhole} from 'lucide-react';

type State='loading'|'available'|'registered'|'connected'|'unavailable';
const texts={
 fr:{title:'Connecter Make à Clara',intro:'Associez votre compte Make pour permettre ensuite des recherches Drive avec votre accord.',token:'Jeton API Make',scenario:'Identifiant du scénario de recherche Drive',zone:'Région Make',confirm:'Vérifier et connecter',secondary:'Confirmer la connexion à Clara ?',cancel:'Annuler',required:'Jeton Make avec les autorisations scenarios:read, scenarios:write et scenarios:run. Le scénario doit être limité à la recherche Drive approuvée.',safe:'Le jeton est chiffré dans Clara OS. Aucune automatisation n’est lancée par cette connexion.',working:'Vérification sécurisée…',success:'Compte Make relié. Vous pouvez maintenant actualiser les autorisations de Clara.',connected:'Un compte Make est déjà enregistré pour cet espace.',unavailable:'État de connexion indisponible. Aucune modification effectuée.',error:'Connexion non validée. Vérifiez le jeton, les droits API et le scénario.',approved:'Je confirme connecter ce compte Make à cet espace Clara OS.',placeholder:'Jeton à saisir uniquement ici'},
 en:{title:'Connect Make to Clara',intro:'Link your Make account for approved Drive searches.',token:'Make API token',scenario:'Drive search scenario ID',zone:'Make region',confirm:'Verify and connect',secondary:'Confirm connecting Make to Clara?',cancel:'Cancel',required:'The Make token needs scenarios:read, scenarios:write, and scenarios:run. The scenario must be the approved Drive-only search.',safe:'The token is encrypted in Clara OS. Connecting does not execute a scenario.',working:'Checking securely…',success:'Make connected. You can refresh Clara permissions.',connected:'A Make account already exists in this workspace.',unavailable:'Connection status unavailable. No changes made.',error:'Connection could not be verified. Check your token, scopes and scenario.',approved:'I approve linking this Make account to this Clara workspace.',placeholder:'Enter token only here'},
 es:{title:'Conectar Make a Clara',intro:'Vincule Make para búsquedas Drive autorizadas.',token:'Token API Make',scenario:'ID del escenario Drive',zone:'Región Make',confirm:'Verificar y conectar',secondary:'¿Confirmar la conexión?',cancel:'Cancelar',required:'Permisos: scenarios:read, scenarios:write y scenarios:run. El escenario debe limitarse a la búsqueda Drive.',safe:'Token cifrado. La conexión no ejecuta escenarios.',working:'Verificando…',success:'Make conectado. Actualice los permisos de Clara.',connected:'Ya hay una conexión Make en este espacio.',unavailable:'Estado no disponible. Sin cambios.',error:'Conexión no validada. Compruebe el token, permisos y escenario.',approved:'Autorizo conectar Make a este espacio Clara.',placeholder:'Introduzca el token aquí'},
 de:{title:'Make mit Clara verbinden',intro:'Verbinden Sie Make für autorisierte Drive-Suchen.',token:'Make API-Token',scenario:'Drive-Szenario-ID',zone:'Make-Region',confirm:'Prüfen und verbinden',secondary:'Verbindung bestätigen?',cancel:'Abbrechen',required:'Erforderlich: scenarios:read, scenarios:write, scenarios:run. Nur geprüftes Drive-Leseszenario.',safe:'Token verschlüsselt. Keine Ausführung durch die Verbindung.',working:'Sichere Prüfung…',success:'Make verbunden. Clara-Berechtigungen aktualisieren.',connected:'Make ist bereits für diesen Workspace konfiguriert.',unavailable:'Verbindungsstatus nicht verfügbar. Keine Änderung.',error:'Verbindung nicht bestätigt. Token, Rechte und Szenario prüfen.',approved:'Ich erlaube diese Make-Verbindung zu Clara.',placeholder:'Token nur hier eingeben'},
 it:{title:'Connettere Make a Clara',intro:'Collega Make per ricerche Drive autorizzate.',token:'Token API Make',scenario:'ID scenario Drive',zone:'Regione Make',confirm:'Verifica e collega',secondary:'Confermare la connessione?',cancel:'Annulla',required:'Permessi: scenarios:read, scenarios:write e scenarios:run. Scenario limitato alla ricerca Drive.',safe:'Token cifrato. La connessione non esegue scenari.',working:'Verifica sicura…',success:'Make collegato. Aggiorna i permessi di Clara.',connected:'Make già configurato per questo spazio.',unavailable:'Stato connessione non disponibile. Nessuna modifica.',error:'Connessione non verificata. Controlla token, permessi e scenario.',approved:'Autorizzo la connessione Make a questo spazio Clara.',placeholder:'Inserisci token solo qui'},
} as const;

export default function MakeNativeOnboardingPanel(){
 const locale=useLocale();
 const lang=(locale in texts?locale:'fr') as keyof typeof texts;
 const t=texts[lang];
 const [status,setStatus]=useState<State>('loading');
 const [token,setToken]=useState('');
 const [scenario,setScenario]=useState('');
 const [zone,setZone]=useState('eu1');
 const [confirmation,setConfirmation]=useState(false);
 const [approved,setApproved]=useState(false);
 const [busy,setBusy]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();
  void fetch('/api/connections/make/status',{cache:'no-store',credentials:'same-origin',signal:abort.signal})
   .then(async r=>{
    if(!r.ok)throw Error('unavailable');
    const v:unknown=await r.json();
    const d=v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
    if(d.status==='NOT_CONFIGURED')setStatus('available');
    else if(typeof d.status==='string'&&d.status!=='UNAVAILABLE')setStatus('registered');
    else setStatus('unavailable');
   }).catch(()=>{if(!abort.signal.aborted)setStatus('unavailable');});
  return ()=>abort.abort();
 },[]);
 const connect=async()=>{
  if(busy||!approved||!confirmation)return;
  const id=Number(scenario);
  if(!Number.isSafeInteger(id)||id<1||!token.trim()){setFailed(true);return;}
  setBusy(true);setFailed(false);
  try{
   const r=await fetch('/api/native/connectors/make/connect',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({approved:true,token,scenarioId:id,zone}),
   });
   if(!r.ok)throw Error('not confirmed');
   setToken('');setStatus('connected');setConfirmation(false);setApproved(false);
  }catch{setFailed(true);}
  finally{setBusy(false);}
 };
 return <section aria-labelledby="make-native-title" className="mt-7 rounded-2xl border border-cyan-400/20 bg-white/[0.025] p-6">
  <h2 id="make-native-title" className="flex items-center gap-2 text-lg font-medium text-white">
   <LockKeyhole size={20} className="text-cyan-300"/>{t.title}
  </h2>
  <p className="mt-2 text-sm text-white/55">{t.intro}</p>
  {status==='loading'?<p className="mt-4 text-sm text-white/55">{t.working}</p>:
   status==='unavailable'?<p className="mt-4 text-sm text-amber-200">{t.unavailable}</p>:
   (status==='connected'||status==='registered')?<p className="mt-4 text-sm text-cyan-200">{status==='connected'?t.success:t.connected}</p>:
   <div className="mt-5 max-w-xl space-y-4">
    <label className="block text-sm text-white/80">{t.token}
     <input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}
      placeholder={t.placeholder} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-300"/>
    </label>
    <div className="grid grid-cols-2 gap-3">
     <label className="text-sm text-white/80">{t.scenario}
      <input inputMode="numeric" value={scenario} placeholder="7295042" onChange={e=>setScenario(e.target.value)}
       className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-white"/>
     </label>
     <label className="text-sm text-white/80">{t.zone}
      <select value={zone} onChange={e=>setZone(e.target.value)}
       className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white">
       {['eu1','eu2','us1','us2','ca1','au1'].map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}
      </select>
     </label>
    </div>
    <p className="text-xs leading-5 text-white/50">{t.required}</p>
    <p className="flex items-start gap-2 text-xs leading-5 text-white/60"><ShieldCheck size={16} className="shrink-0 text-cyan-300"/>{t.safe}</p>
    {!confirmation?<button type="button" disabled={busy||token.length<20} onClick={()=>setConfirmation(true)}
      className="rounded-xl border border-cyan-300/35 bg-cyan-700/20 px-4 py-3 text-sm text-cyan-100 disabled:opacity-35">{t.confirm}</button>:
     <div className="rounded-xl border border-cyan-300/20 p-4">
      <p className="mb-3 text-sm text-white">{t.secondary}</p>
      <label className="flex items-center gap-2 text-sm text-white/70">
       <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>{t.approved}
      </label>
      <div className="mt-4 flex gap-3">
       <button type="button" disabled={!approved||busy} onClick={()=>void connect()}
        className="rounded-xl bg-cyan-700/50 px-4 py-3 text-sm text-white disabled:opacity-35">{busy?t.working:t.confirm}</button>
       <button type="button" disabled={busy} onClick={()=>{setConfirmation(false);setApproved(false);}}
        className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70">{t.cancel}</button>
      </div>
     </div>}
    {failed&&<p role="alert" className="text-sm text-amber-200">{t.error}</p>}
   </div>}
 </section>;
}
