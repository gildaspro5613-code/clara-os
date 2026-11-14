'use client';

import {useEffect,useState} from 'react';

type State='uncertified'|'configured'|'ready_for_test'|'certified'|'certified_inactive';
const labels={
 fr:{uncertified:'Non certifié',configured:'Configuré · non certifié',ready_for_test:'Lecture prête · test requis',certified:'Lecture certifiée',certified_inactive:'Certifié · accès révoqué'},
 en:{uncertified:'Not certified',configured:'Configured · not certified',ready_for_test:'READ ready · test required',certified:'READ certified',certified_inactive:'Certified · access revoked'},
 es:{uncertified:'No certificado',configured:'Configurado · no certificado',ready_for_test:'Lectura lista · prueba pendiente',certified:'Lectura certificada',certified_inactive:'Certificado · acceso revocado'},
 de:{uncertified:'Nicht zertifiziert',configured:'Konfiguriert · nicht zertifiziert',ready_for_test:'Lesen bereit · Test erforderlich',certified:'Lesen zertifiziert',certified_inactive:'Zertifiziert · Zugriff widerrufen'},
 it:{uncertified:'Non certificato',configured:'Configurato · non certificato',ready_for_test:'Lettura pronta · test richiesto',certified:'Lettura certificata',certified_inactive:'Certificato · accesso revocato'},
} as const;

export default function MakeAutomationCertification({locale}:{locale:string}){
 const lang=locale in labels?locale as keyof typeof labels:'fr';
 const [state,setState]=useState<State>('uncertified');
 useEffect(()=>{
  const ctrl=new AbortController();
  void fetch('/api/native/make/status',{cache:'no-store',credentials:'same-origin',signal:ctrl.signal})
   .then(async response=>{
    if(!response.ok)return;
    const body:unknown=await response.json();
    if(!body||typeof body!=='object'||Array.isArray(body))return;
    const data=body as Record<string,unknown>;
    const next=data.state;
    if(typeof next==='string'&&Object.prototype.hasOwnProperty.call(labels.fr,next)){
      // The backend's certification evidence is authoritative. A missing proof
      // can never be converted into a success badge by the presentation layer.
      if(next.startsWith('certified')&&data.certified!==true)return;
      setState(next as State);
    }
   }).catch(()=>{});
  return ()=>ctrl.abort();
 },[]);
 return <span data-make-certification={state} aria-live="polite" className="max-w-[65%] rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-right text-[11px] font-medium leading-4 text-slate-200">{labels[lang][state]}</span>;
}
