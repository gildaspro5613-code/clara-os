'use client';

import {useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import NativeScopeSelector from './NativeScopeSelector';

/** Existing native controls, mounted only on explicit request. No authority changes. */
export default function NativeContextMenu(){
 const ui=useTranslations('ui'),common=useTranslations('common');
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 function close(){dialog.current?.close();}
 return <>
  <button ref={trigger} type="button" data-open-native-context aria-haspopup="dialog" aria-expanded={open} className="mb-4 flex items-center gap-2 rounded-lg text-left text-sm text-slate-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-cyan-200" onClick={()=>{setOpen(true);dialog.current?.showModal();}}>
   <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-cyan-400"/>{ui('uiWorkspace')}
  </button>
  <dialog ref={dialog} aria-label={ui('uiWorkspace')} data-native-context-dialog onClose={()=>{setOpen(false);trigger.current?.focus();}} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}}}
   className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-x-hidden overflow-y-auto rounded-2xl border border-cyan-300/20 bg-[#08111F] p-4 text-white shadow-2xl backdrop:bg-black/70 sm:p-6 [&_.native-context]:border-0 [&_.native-context]:p-0 [&_select]:max-w-full [&_input]:max-w-full [&_label]:min-w-0 [&_label]:max-w-full">
   <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{ui('uiWorkspace')}</h2><button type="button" autoFocus onClick={close} className="rounded-lg border border-cyan-300/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">{common('close')}</button></div>
   {open&&<NativeScopeSelector/>}
  </dialog>
 </>;
}
