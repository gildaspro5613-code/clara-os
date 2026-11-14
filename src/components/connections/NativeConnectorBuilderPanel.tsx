'use client';

import {useEffect,useState} from 'react';
import {useLocale} from 'next-intl';
import {ShieldCheck,RefreshCw} from 'lucide-react';

type Item={provider:string;capabilityId:string;connectionId:string};
type Snapshot={authorized:Item[];candidates:Item[];certified:false};
type Pending={item:Item;operation:'grant'|'revoke'};

const locales={
 fr:{title:'Autorisations de Clara',intro:'Choisissez ce que Clara peut consulter avec vos comptes déjà connectés.',none:'Aucune lecture disponible pour ce projet. Les connexions doivent d’abord être validées.',allow:'Autoriser la lecture',revoke:'Révoquer',approved:'Lecture autorisée',confirm:'Confirmer',cancel:'Annuler',working:'Enregistrement…',ambiguous:'Plusieurs comptes possibles : sélection du compte requise avant autorisation.',error:'Opération indisponible. Aucune autorisation nouvelle confirmée.',unavailable:'Les autorisations nécessitent une session Clara authentifiée et un projet sélectionné.',notCertified:'Une autorisation ne signifie pas que le fournisseur est certifié.',confirmGrant:'Autoriser Clara à consulter cette ressource pour le projet sélectionné ?',confirmRevoke:'Retirer immédiatement cette autorisation de lecture ?',refresh:'Actualiser'},
 en:{title:'Clara permissions',intro:'Choose what Clara may read using your connected accounts.',none:'No approved reads available for this project yet.',allow:'Allow read',revoke:'Revoke',approved:'Read allowed',confirm:'Confirm',cancel:'Cancel',working:'Saving…',ambiguous:'Multiple accounts: choose a specific account before granting access.',error:'Action unavailable. No new permission confirmed.',unavailable:'Sign in to Clara and select a project to manage permissions.',notCertified:'Permission is not proof of supplier certification.',confirmGrant:'Allow Clara to read this resource for the selected project?',confirmRevoke:'Immediately revoke this read permission?',refresh:'Refresh'},
 es:{title:'Permisos de Clara',intro:'Elija qué puede consultar Clara con sus cuentas conectadas.',none:'No hay lecturas aprobadas para este proyecto.',allow:'Autorizar lectura',revoke:'Revocar',approved:'Lectura autorizada',confirm:'Confirmar',cancel:'Cancelar',working:'Guardando…',ambiguous:'Varias cuentas: seleccione una cuenta antes de autorizar.',error:'Acción no disponible. No se confirmó ningún permiso nuevo.',unavailable:'Inicie sesión y seleccione un proyecto.',notCertified:'Una autorización no certifica al proveedor.',confirmGrant:'¿Autorizar la lectura para este proyecto?',confirmRevoke:'¿Revocar este permiso de lectura inmediatamente?',refresh:'Actualizar'},
 de:{title:'Claras Berechtigungen',intro:'Legen Sie fest, was Clara aus verbundenen Konten lesen darf.',none:'Noch keine geprüften Leseaktionen für dieses Projekt.',allow:'Lesen erlauben',revoke:'Widerrufen',approved:'Lesen erlaubt',confirm:'Bestätigen',cancel:'Abbrechen',working:'Speichern…',ambiguous:'Mehrere Konten: Bitte vor Freigabe ein Konto auswählen.',error:'Aktion nicht verfügbar. Keine neue Freigabe bestätigt.',unavailable:'Bei Clara anmelden und ein Projekt auswählen.',notCertified:'Eine Freigabe ist keine Anbieterzertifizierung.',confirmGrant:'Clara das Lesen für dieses Projekt erlauben?',confirmRevoke:'Diese Leseberechtigung sofort widerrufen?',refresh:'Aktualisieren'},
 it:{title:'Permessi di Clara',intro:'Scegli cosa può leggere Clara dagli account collegati.',none:'Nessuna lettura approvata per questo progetto.',allow:'Autorizza lettura',revoke:'Revoca',approved:'Lettura autorizzata',confirm:'Conferma',cancel:'Annulla',working:'Salvataggio…',ambiguous:'Più account: selezionare un account prima di autorizzare.',error:'Operazione non disponibile. Nessun nuovo permesso confermato.',unavailable:'Accedi a Clara e seleziona un progetto.',notCertified:'Un’autorizzazione non certifica il fornitore.',confirmGrant:'Autorizzare Clara alla lettura per questo progetto?',confirmRevoke:'Revocare subito il permesso di lettura?',refresh:'Aggiorna'},
} as const;
function visibleName(capabilityId:string,lang:string):string{
 const names:Record<string,Record<string,string>>={
  'brevo.list.read':{fr:'Listes de contacts',en:'Contact lists',es:'Listas de contactos',de:'Kontaktlisten',it:'Liste contatti'},
  'brevo.contact.search':{fr:'Rechercher des contacts',en:'Find contacts',es:'Buscar contactos',de:'Kontakte suchen',it:'Cerca contatti'},
  'brevo.campaign.read':{fr:'Campagnes',en:'Campaigns',es:'Campañas',de:'Kampagnen',it:'Campagne'},
  'brevo.template.search':{fr:'Modèles d’email',en:'Email templates',es:'Plantillas de correo',de:'E-Mail-Vorlagen',it:'Modelli email'},
  'brevo.stats.read':{fr:'Statistiques',en:'Statistics',es:'Estadísticas',de:'Statistik',it:'Statistiche'},
  'github.repository.read':{fr:'Dépôts de code',en:'Repositories',es:'Repositorios',de:'Repositorys',it:'Repository'},
  'github.repository.list':{fr:'Liste des dépôts',en:'Repository list',es:'Lista de repositorios',de:'Repository-Liste',it:'Elenco repository'},
 };
 const entry=names[capabilityId];
 if(entry)return entry[lang]??entry.fr;
 return capabilityId.split('.').slice(1).join(' ').replace(/[._-]/g,' ');
}
const equal=(a:Item,b:Item)=>a.capabilityId===b.capabilityId&&a.connectionId===b.connectionId&&a.provider===b.provider;

export default function NativeConnectorBuilderPanel(){
 const locale=useLocale();
 const lang=(locale in locales?locale:'fr') as keyof typeof locales;
 const t=locales[lang];
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 const [pending,setPending]=useState<Pending|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 const refresh=async(signal?:AbortSignal)=>{
  try{
   const response=await fetch('/api/native/connectors',{credentials:'same-origin',cache:'no-store',signal});
   if(!response.ok)throw Error('not available');
   const data:unknown=await response.json();
   if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid');
   const candidate=data as Partial<Snapshot>;
   if(!Array.isArray(candidate.candidates)||!Array.isArray(candidate.authorized))throw Error('invalid');
   setSnapshot({candidates:candidate.candidates,authorized:candidate.authorized,certified:false});
   setUnavailable(false);
  }catch{if(!signal?.aborted){setUnavailable(true);setSnapshot(null);}}
 };
 useEffect(()=>{
  const controller=new AbortController();void refresh(controller.signal);
  return ()=>controller.abort();
 },[]);
 const submit=async()=>{
  if(!pending||busy)return;
  setBusy(true);setError(false);
  try{
   const response=await fetch('/api/native/connectors',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({connectionId:pending.item.connectionId,capabilityId:pending.item.capabilityId,operation:pending.operation,approved:true}),
   });
   // Only the server-reported change counts. Never show success optimistically.
   if(!response.ok)throw Error('not confirmed');
   await refresh();setPending(null);
  }catch{setError(true);}
  finally{setBusy(false);}
 };
 const candidateList=snapshot?.candidates??[];
 return (
  <section aria-labelledby="clara-builder-title" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
   <div className="flex items-start justify-between gap-4">
    <div>
     <h2 id="clara-builder-title" className="flex items-center gap-2 text-lg font-medium text-white">
      <ShieldCheck size={20} className="text-cyan-300"/>{t.title}
     </h2>
     <p className="mt-2 text-sm leading-6 text-white/55">{t.intro}</p>
    </div>
    <button type="button" aria-label={t.refresh} onClick={()=>void refresh()} className="rounded-lg border border-white/10 px-3 py-2 text-white/60 hover:text-white"><RefreshCw size={16}/></button>
   </div>
   <p className="mt-2 text-xs text-white/35">{t.notCertified}</p>
   {unavailable?<p className="mt-5 text-sm text-amber-100/70">{t.unavailable}</p>:
    candidateList.length===0?<p className="mt-5 text-sm text-white/50">{t.none}</p>:
    <div className="mt-5 grid gap-3 md:grid-cols-2">
     {candidateList.map(item=>{
      const authorized=Boolean(snapshot?.authorized.some(active=>equal(active,item)));
      const count=candidateList.filter(c=>c.capabilityId===item.capabilityId).length;
      const ambiguous=count>1;
      return <article key={item.provider+':'+item.capabilityId+':'+item.connectionId} className="rounded-xl border border-white/10 bg-black/20 p-4">
       <div className="text-xs uppercase tracking-wide text-cyan-300/75">{item.provider}</div>
       <div className="mt-1 text-sm font-medium text-white">{visibleName(item.capabilityId,lang)}</div>
       <p className="mt-2 text-xs text-white/50">{ambiguous?t.ambiguous:authorized?t.approved:t.notCertified}</p>
       {!ambiguous&&<button type="button" disabled={busy} className="mt-4 rounded-lg border border-cyan-300/20 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40" onClick={()=>{setError(false);setPending({item,operation:authorized?'revoke':'grant'});}}>
        {authorized?t.revoke:t.allow}
       </button>}
      </article>;
     })}
    </div>
   }
   {pending&&<div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
    <p className="text-sm text-white">{pending.operation==='grant'?t.confirmGrant:t.confirmRevoke}</p>
    <p className="mt-1 text-sm text-cyan-200">{pending.item.provider} · {visibleName(pending.item.capabilityId,lang)}</p>
    <div className="mt-4 flex gap-3">
     <button type="button" disabled={busy} onClick={()=>void submit()} className="rounded-lg bg-cyan-700/40 px-4 py-2 text-sm text-white disabled:opacity-40">{busy?t.working:t.confirm}</button>
     <button type="button" disabled={busy} onClick={()=>setPending(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 disabled:opacity-40">{t.cancel}</button>
    </div>
   </div>}
   {error&&<p role="alert" className="mt-3 text-sm text-amber-100">{t.error}</p>}
  </section>
 );
}
