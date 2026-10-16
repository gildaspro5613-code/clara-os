import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
/** Exact disposable Google provider boundary only. Never forwards any network. */
export function googleWorkHttp(url,init,state,stateFile,actor){
 const work=state.workspace;if(!work)return undefined;
 const method=init?.method??'GET',headers=new Headers(init?.headers),save=()=>writeFileSync(stateFile,JSON.stringify(state));
 const fail=status=>Response.json({error:{code:status,message:'Synthetic Google refusal'}},{status});
 if(work.deny||actor!=='a')return fail(403);
 const calendarPath=url.pathname.match(/^\/calendar\/v3\/users\/me\/calendarList(?:\/(.+))?$/);
 if(calendarPath){if(calendarPath[1]){const c=work.calendars[decodeURIComponent(calendarPath[1])];return c?Response.json(c):fail(404);}const values=Object.values(work.calendars),offset=Number(url.searchParams.get('pageToken')??0),size=work.calendarPageSize??50;return Response.json({items:values.slice(offset,offset+size),...(offset+size<values.length?{nextPageToken:String(offset+size)}:{})});}
 const eventsPath=url.pathname.match(/^\/calendar\/v3\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/);
 const drivePath=url.pathname.match(/^\/(?:upload\/)?drive\/v3\/files(?:\/([^/]+))?(\/permissions)?$/);
 if(!eventsPath&&!drivePath)return undefined;
 if(url.pathname==='/drive/v3/files/generateIds'){const id='work-file-'+(++work.generated);save();return Response.json({ids:[id]});}
 if(method==='GET'){
  if(eventsPath){const cal=decodeURIComponent(eventsPath[1]),id=eventsPath[2];if(!work.calendars[cal])return fail(403);if(id){const e=work.events[cal+'/'+id];return e?Response.json(e):fail(404);}const from=Date.parse(url.searchParams.get('timeMin')),until=Date.parse(url.searchParams.get('timeMax'));const events=Object.entries(work.events).filter(([key,e])=>key.startsWith(cal+'/')&&Date.parse(e.start.dateTime)>=from&&Date.parse(e.start.dateTime)<until).map(([,e])=>e),offset=Number(url.searchParams.get('pageToken')??0),size=work.eventPageSize??50;return Response.json({items:events.slice(offset,offset+size),...(offset+size<events.length?{nextPageToken:String(offset+size)}:{})});}
  const id=drivePath[1],file=work.files[id];if(!file)return undefined;
  if(drivePath[2])return Response.json({permissions:[{id:'permission-a',type:'user',role:'owner'}]});
  if(url.searchParams.get('alt')==='media')return new Response(Buffer.from(file.content??'','base64'),{headers:{'Content-Type':file.mimeType}});
  return Response.json(file,{headers:{ETag:file.etag}});
 }
 if(!['POST','PATCH'].includes(method))return fail(405);
 if(work.refuseNext){const status=work.refuseNext;delete work.refuseNext;save();return fail(status);}
 let input,content;
 if(eventsPath){if(url.searchParams.get('sendUpdates')!=='none')throw Error('No invitation strategy permitted');input=JSON.parse(String(init.body));if(input.attendees?.length)throw Error('No attendees permitted');}
 else if(headers.get('content-type')?.startsWith('multipart/related')){
  const boundary=headers.get('content-type').split('boundary=')[1],data=Buffer.from(init.body),split=data.indexOf('\r\n--'+boundary,0,'utf8');const first=data.subarray(0,split).toString();input=JSON.parse(first.slice(first.indexOf('\r\n\r\n')+4));const rest=data.subarray(split+('\r\n--'+boundary).length),begin=rest.indexOf('\r\n\r\n')+4,end=rest.lastIndexOf('\r\n--'+boundary+'--');content=rest.subarray(begin,end);
 }else input=JSON.parse(String(init.body));
 const id=eventsPath?(eventsPath[2]??input.id):(drivePath[1]??input.id),key=eventsPath?decodeURIComponent(eventsPath[1])+'/'+id:id,current=eventsPath?work.events[key]:work.files[id];
 if(headers.has('if-match')&&headers.get('if-match')!==current?.etag)return fail(412);
 if(method==='POST'&&current)return fail(409);
 work.writes.push({method,path:url.pathname,ifMatch:headers.get('if-match'),id});
 if(eventsPath){work.events[key]={...current,...input,id,etag:'"work-event-'+work.writes.length+'"'};}
 else{const bytes=content??Buffer.from(current?.content??'','base64');work.files[id]={...current,...input,id,mimeType:current?.mimeType??input.mimeType??'application/octet-stream',version:String(Number(current?.version??0)+1),etag:'"work-file-'+work.writes.length+'"',parents:url.searchParams.has('addParents')?[url.searchParams.get('addParents')]:input.parents??current?.parents??[],isAppAuthorized:true,trashed:false,capabilities:{canEdit:true,canAddChildren:false,canMoveItemWithinDrive:true,canDownload:true},content:bytes.toString('base64'),md5Checksum:createHash('md5').update(bytes).digest('hex')};}
 const lose=work.loseNextAck;delete work.loseNextAck;save();if(lose)throw TypeError('Synthetic lost acknowledgement after durable Google mutation');
 return Response.json(eventsPath?work.events[key]:work.files[id]);
}
