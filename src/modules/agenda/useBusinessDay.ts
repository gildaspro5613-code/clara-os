'use client';
import {useSyncExternalStore} from 'react';
import {businessDayKey,businessDayWindow} from './calendar-window';
/** Stable hydration snapshot; one timer at Paris midnight, plus wake/resume checks. */
function subscribe(notify:()=>void){
 let timer:ReturnType<typeof setTimeout>;
 const update=()=>{notify();clearTimeout(timer);timer=setTimeout(update,Math.max(1,businessDayWindow().end.getTime()-Date.now()+5));};
 const visible=()=>{if(document.visibilityState==='visible')update();};
 update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',visible);
 return()=>{clearTimeout(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',visible);};
}
const snapshot=()=>businessDayKey();
const serverSnapshot=()=>null;
export function useBusinessDay(){return useSyncExternalStore<string|null>(subscribe,snapshot,serverSnapshot);}
