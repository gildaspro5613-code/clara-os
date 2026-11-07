'use client';
import {useEffect,useState} from 'react';
import {useTranslations} from 'next-intl';

type CalendarOption={id:string;summary:string};
type SetupState='loading'|'choose'|'noConnection'|'noConsent'|'noMission'|'empty'|'error';

async function googleRead(path:string){
 const response=await fetch(path,{cache:'no-store'});
 const data=await response.json();
 if(!response.ok||data?.success!==true)throw new Error('AGENDA_READ_FAILED');
 return data;
}
async function googleWrite(connectionId:string,action:'inspect'|'bind',input:{kind:'calendar';resourceId:string;version?:string}){
 const response=await fetch('/api/native/google/work',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({connectionId,action,...input}),
 });
 const data=await response.json();
 if(!response.ok||data?.success!==true)throw new Error('AGENDA_SELECTION_FAILED');
 return data;
}

/** One-time, explicit Calendar choice using the existing native Google authority.
 * This component never lists accounts, grants OAuth consent or writes Google events. */
export default function AgendaCalendarSetup(){
 const t=useTranslations('agendaCalendar');
 const [state,setState]=useState<SetupState>('loading');
 const [connectionId,setConnectionId]=useState('');
 const [calendars,setCalendars]=useState<CalendarOption[]>([]);
 const [selected,setSelected]=useState('');
 const [nextPageToken,setNextPageToken]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [saveError,setSaveError]=useState(false);
 const [retry,setRetry]=useState(0);

 useEffect(()=>{
  let live=true;const controller=new AbortController();
  async function load(){
   setState('loading');setCalendars([]);setSelected('');setNextPageToken(null);setSaveError(false);
   try{
    const response=await fetch('/api/connections/google',{cache:'no-store',signal:controller.signal});
    const list=await response.json();
    if(!response.ok||list?.success!==true)throw Error('AGENDA_CONNECTION_UNAVAILABLE');
    const connection=(list.connections as Array<{id:string;status:string}>|undefined)?.find(c=>c.id===list.selectedConnectionId&&c.status==='ACTIVE');
    if(!connection){if(live)setState('noConnection');return;}
    const base='/api/native/google/work?'+new URLSearchParams({connectionId:connection.id});
    const capabilities=await googleRead(base+'&action=capabilities');
    if(!capabilities.calendar){if(live)setState('noConsent');return;}
    if(!capabilities.missionId){if(live)setState('noMission');return;}
    const result=await googleRead(base+'&action=calendars');
    if(!live)return;
    const options=(Array.isArray(result.calendars)?result.calendars:[]).filter((c:CalendarOption)=>typeof c.id==='string'&&typeof c.summary==='string'&&c.id!=='primary');
    setConnectionId(connection.id);setCalendars(options);setNextPageToken(result.nextPageToken??null);
    if(options.length===1)setSelected(options[0].id);
    setState(options.length||result.nextPageToken?'choose':'empty');
   }catch{if(live&&!controller.signal.aborted)setState('error');}
  }
  void load();
  return()=>{live=false;controller.abort();};
 },[retry]);

 async function more(){
  if(!connectionId||!nextPageToken||busy)return;
  setBusy(true);setSaveError(false);
  try{
   const url='/api/native/google/work?'+new URLSearchParams({connectionId,action:'calendars',pageToken:nextPageToken});
   const response=await googleRead(url);
   const additional=(Array.isArray(response.calendars)?response.calendars:[]).filter((c:CalendarOption)=>typeof c.id==='string'&&typeof c.summary==='string'&&c.id!=='primary');
   setCalendars(previous=>[...previous,...additional.filter((c:CalendarOption)=>!previous.some(p=>p.id===c.id))]);
   setNextPageToken(response.nextPageToken??null);
  }catch{setSaveError(true);}
  finally{setBusy(false);}
 }
 async function choose(){
  if(!connectionId||busy||!calendars.some(c=>c.id===selected))return;
  setBusy(true);setSaveError(false);
  try{
   const inspected=await googleWrite(connectionId,'inspect',{kind:'calendar',resourceId:selected});
   const resource=inspected.resource as {id?:string;version?:string}|undefined;
   if(resource?.id!==selected||!resource.version)throw Error('AGENDA_RESOURCE_INVALID');
   await googleWrite(connectionId,'bind',{kind:'calendar',resourceId:selected,version:resource.version});
   // The canonical session and its scoped resource are now set; fetch actual
   // events through the same read-only /api/calendar route as before.
   window.location.reload();
  }catch{setSaveError(true);setBusy(false);}
 }
 return <div data-agenda-calendar-setup className="agenda-simple-setup" aria-busy={state==='loading'||busy}>
  {state==='loading'&&<p role="status">{t('setupLoading')}</p>}
  {state==='noConnection'&&<p role="status">{t('connectionRequired')}</p>}
  {state==='noConsent'&&<p role="status">{t('setupConsentMissing')}</p>}
  {state==='noMission'&&<p role="status">{t('setupMissionMissing')}</p>}
  {state==='empty'&&<p role="status">{t('setupNoCalendars')}</p>}
  {state==='error'&&<p role="alert">{t('setupUnavailable')}</p>}
  {state==='choose'&&<>
   <p>{t('setupIntro')}</p>
   <div className="agenda-simple-setup-controls">
    <label htmlFor="agenda-simple-calendar">{t('setupCalendarLabel')}</label>
    <select id="agenda-simple-calendar" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setSaveError(false);}}>
     <option value="">{t('setupChoose')}</option>
     {calendars.map(c=><option key={c.id} value={c.id}>{c.summary}</option>)}
    </select>
    <button type="button" disabled={!selected||busy} onClick={()=>void choose()}>{busy?t('loading'):t('setupUse')}</button>
   </div>
   {nextPageToken&&<button type="button" disabled={busy} onClick={()=>void more()}>{t('loadMore')}</button>}
  </>}
  {saveError&&<p role="alert">{t('setupUnavailable')}</p>}
  {['error','empty'].includes(state)&&<button type="button" onClick={()=>setRetry(n=>n+1)}>{t('setupRetry')}</button>}
  {state!=='choose'&&state!=='loading'&&<a href="/connexions#google-agenda-administration">{t('reviewConnection')}</a>}
 </div>;
}
