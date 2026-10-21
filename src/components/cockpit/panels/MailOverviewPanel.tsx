'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import GlassPanel from '@/components/ui/GlassPanel';
import {useLocale} from 'next-intl';

type Attention={id:string;subject:string;from:string;priority:'high'|'normal'|'low'|'quarantine';category:string;reason:string};
type Mailbox={connectionId:string;address:string;status:'cached'|'unavailable';highPriorityCount:number|null;quarantineCount:number|null;attention:Attention[];partial:boolean};
type Snapshot={success:boolean;overview:Mailbox[];source:string;freshnessVerified:boolean;complete:boolean};
const copy={
 fr:{title:'Courrier à examiner',empty:'Aucune boîte autorisée',none:'Aucun message signalé dans cet aperçu',stale:'Aperçu enregistré — actualité non vérifiée',partial:'Données partielles ou indisponibles',error:'Aperçu du courrier indisponible',open:'Ouvrir le courrier',quarantine:'Pièce jointe suspecte',high:'À examiner'},
 en:{title:'Mail needing review',empty:'No authorized mailbox',none:'No flagged messages in this snapshot',stale:'Cached snapshot — freshness unverified',partial:'Partial or unavailable data',error:'Mail overview unavailable',open:'Open mail',quarantine:'Suspicious attachment',high:'Review needed'},
 de:{title:'Posteingang prüfen',empty:'Kein autorisiertes Postfach',none:'Keine markierten Nachrichten in dieser Übersicht',stale:'Gespeicherte Übersicht — Aktualität ungeprüft',partial:'Unvollständige oder nicht verfügbare Daten',error:'Mailübersicht nicht verfügbar',open:'E-Mails öffnen',quarantine:'Verdächtiger Anhang',high:'Bitte prüfen'},
 es:{title:'Correo por revisar',empty:'No hay buzones autorizados',none:'No hay mensajes señalados en este resumen',stale:'Resumen guardado — actualidad no verificada',partial:'Datos parciales o no disponibles',error:'Resumen de correo no disponible',open:'Abrir correo',quarantine:'Adjunto sospechoso',high:'Revisar'},
 it:{title:'Posta da esaminare',empty:'Nessuna casella autorizzata',none:'Nessun messaggio segnalato in questa panoramica',stale:'Panoramica salvata — aggiornamento non verificato',partial:'Dati parziali o non disponibili',error:'Panoramica posta non disponibile',open:'Apri posta',quarantine:'Allegato sospetto',high:'Da esaminare'},
} as const;
export default function MailOverviewPanel(){
 const locale=useLocale();const t=copy[locale as keyof typeof copy]??copy.fr;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/native/mail?action=overview',{cache:'no-store',signal:controller.signal,credentials:'same-origin'}).then(async response=>{if(!response.ok)throw Error('mail overview');return response.json() as Promise<Snapshot>;}).then(data=>{if(!controller.signal.aborted){if(!data.success||!Array.isArray(data.overview))setError(true);else setSnapshot(data);}}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[]);
 const boxes=snapshot?.overview??[];const partial=!!snapshot&&(!snapshot.complete||boxes.some(box=>box.partial||box.status!=='cached'));
 return <GlassPanel className="max-h-[17rem] overflow-auto p-4 text-sm text-white" >
  <h2 className="font-semibold">{t.title}</h2>
  {error?<p role="status" className="mt-2 text-white/70">{t.error}</p>:<>
   <p className="mt-2 text-xs text-amber-100/80">{t.stale}</p>
   {partial&&<p role="status" className="mt-1 text-xs text-amber-100/80">{t.partial}</p>}
   {snapshot&&boxes.length===0&&<p className="mt-2 text-white/70">{t.empty}</p>}
   {boxes.map(box=><div key={box.connectionId} className="mt-3 border-t border-white/10 pt-2">
    <p className="break-all font-medium">{box.address}</p>
    {box.status==='unavailable'?<p className="text-xs text-white/60">{t.partial}</p>:box.attention.length===0?<p className="text-xs text-white/60">{t.none}</p>:<ul className="mt-1 space-y-1">{box.attention.slice(0,3).map(message=><li key={message.id} className="truncate text-xs" title={message.subject}><span className="mr-1 text-amber-100">{message.priority==='quarantine'?t.quarantine:t.high}:</span>{message.subject}</li>)}</ul>}
   </div>)}
  </>}
  <Link href="/conversations" className="mt-3 inline-block text-xs text-cyan-300 hover:text-cyan-200">{t.open} →</Link>
 </GlassPanel>;
}
