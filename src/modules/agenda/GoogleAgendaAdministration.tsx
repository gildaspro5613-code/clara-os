'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import NativeDocumentsPanel from '@/components/native/NativeDocumentsPanel';
/** Relocate the existing administration, without duplicating its commands or authority. */
const subscribe=(notify:()=>void)=>{window.addEventListener('hashchange',notify);return()=>window.removeEventListener('hashchange',notify);};
const snapshot=()=>window.location.hash==='#google-agenda-administration';
const serverSnapshot=()=>null;
export default function GoogleAgendaAdministration({children}:{children?:ReactNode}){
 const t=useTranslations('agendaCalendar'),details=useRef<HTMLDetailsElement>(null);
 const [mounted,setMounted]=useState(false);
 const dedicated=useSyncExternalStore<boolean|null>(subscribe,snapshot,serverSnapshot);
 useEffect(()=>{if(window.location.hash==='#google-agenda-administration'&&details.current){details.current.open=true;details.current.scrollIntoView({block:'start'});}},[]);
 return <>{dedicated===false&&children}<details ref={details} id="google-agenda-administration" data-agenda-settings onToggle={event=>{if(event.currentTarget.open)setMounted(true);}} className="mt-6 min-w-0 rounded-2xl border border-cyan-400/20 bg-white/[0.025] p-4 [&_fieldset]:min-w-0 [&_input]:max-w-full [&_select]:max-w-full [&_button]:whitespace-normal [&_button]:break-words">
  <summary className="cursor-pointer text-cyan-100">{t('administration')}</summary>
  {mounted&&<NativeDocumentsPanel workspaceMode="agenda"/>}
 </details></>;
}
