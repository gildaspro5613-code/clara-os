import {GoogleWorkRefused,type GoogleClients,type GooglePlan,type GoogleClientFactory} from '@/lib/native/google-work';
import {createHash} from 'node:crypto';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';
export const workScopes=['openid','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events'];
export function seedGoogleWork(pg:(s:string)=>unknown){
 for(const [id,owner] of [['google-work-a','a'],['google-work-b','b']]){
  const cipher=encryptCredentialPayload({accessToken:'synthetic-google-'+owner,refreshToken:'synthetic-refresh-google-'+owner,expiresAt:Date.now()+3600000,scope:workScopes},Buffer.alloc(32,9));
  pg(`INSERT INTO clara_connections(id,workspace_id,provider,status,scopes) VALUES('${id}','w','google','ACTIVE','${JSON.stringify(workScopes)}');INSERT INTO clara_native_google_authority(connection_id,owner_user_id,workspace_id,issuer,subject) VALUES('${id}','${owner}','w','https://accounts.google.com','google-${owner}');INSERT INTO clara_connection_credentials(connection_id,encrypted_payload) VALUES('${id}','${cipher.replaceAll("'","''")}');`);
 }
}
type FileRecord={id:string;name:string;mimeType:string;version:string;etag:string;parents:string[];isAppAuthorized:boolean;trashed:boolean;capabilities:{canEdit:boolean;canAddChildren:boolean;canMoveItemWithinDrive:boolean;canDownload:boolean};appProperties:Record<string,string>;md5Checksum:string;content:Buffer};
type CalendarRecord={id:string;summary:string;etag:string;accessRole:string;deleted:boolean};
export class SimulatedGoogleWork {
 principal='google-a';generated=0;calls:GooglePlan[]=[];outcome:'ok'|'lost-ack'|'no-effect'|'refuse'='ok';deny=false;beforeMutation?:()=>Promise<void>;onMutation?:()=>void;
 files=new Map<string,FileRecord>();calendars=new Map<string,CalendarRecord>();events=new Map<string,Record<string,unknown>>();
 constructor(){this.folder('folder-a');this.folder('folder-other');this.calendar('calendar-a');this.calendar('calendar-other');}
 folder(id:string){this.files.set(id,{id,name:id,mimeType:'application/vnd.google-apps.folder',version:'1',etag:'"'+id+'-1"',parents:[],isAppAuthorized:true,trashed:false,capabilities:{canEdit:true,canAddChildren:true,canMoveItemWithinDrive:true,canDownload:false},appProperties:{},md5Checksum:'',content:Buffer.alloc(0)});}
 calendar(id:string){this.calendars.set(id,{id,summary:id,etag:'"'+id+'-1"',accessRole:'owner',deleted:false});}
 private readable(){if(this.deny)throw {response:{status:403}};}
 clients():GoogleClients{
  const auth={request:async()=>{this.readable();return {data:{sub:this.principal}};},getRequestHeaders:async()=>new Headers({Authorization:'Bearer synthetic-google-a'})};
  return {drive:{context:{_options:{auth}},about:{get:async()=>({data:{user:{permissionId:'permission-a'}}})},permissions:{list:async()=>({data:{permissions:[{id:'permission-a',type:'user',role:'owner'}]}})},files:{
   get:async({fileId,alt}:{fileId:string;alt?:string})=>{this.readable();const f=this.files.get(fileId);if(!f)throw {response:{status:404}};if(alt==='media'){const {Readable}=await import('node:stream');return {data:Readable.from(f.content)};}return {data:structuredClone(f),headers:new Headers({etag:f.etag})};},
   generateIds:async()=>{this.readable();return {data:{ids:['work-file-'+(++this.generated)]}};}
  }},calendar:{context:{_options:{auth}},calendarList:{get:async({calendarId}:{calendarId:string})=>{this.readable();const c=this.calendars.get(calendarId);if(!c)throw {response:{status:404}};return {data:{...c}};},list:async()=>({data:{items:[...this.calendars.values()]}})},events:{
   get:async({calendarId,eventId}:{calendarId:string;eventId:string})=>{this.readable();const e=this.events.get(calendarId+'/'+eventId);if(!e)throw {response:{status:404}};return {data:structuredClone(e)};},
   list:async({calendarId,timeMin,timeMax}:{calendarId:string;timeMin:string;timeMax:string})=>{this.readable();return {data:{items:[...this.events].filter(([key,e])=>key.startsWith(calendarId+'/')&&Date.parse(String((e.start as {dateTime:string}).dateTime))>=Date.parse(timeMin)&&Date.parse(String((e.start as {dateTime:string}).dateTime))<Date.parse(timeMax)).map(([,e])=>structuredClone(e))}};}
  }},mutate:async (plan:GooglePlan)=>this.mutate(plan)} as unknown as GoogleClients;
 }
 factory:GoogleClientFactory=async()=>this.clients();
 async mutate(plan:GooglePlan){
  this.calls.push(plan);await this.beforeMutation?.();if(this.outcome==='refuse')throw new GoogleWorkRefused(412);if(this.outcome==='no-effect')throw Error('Synthetic connection loss before effect');this.readable();
  const i=plan.input;
  if(i.kind.startsWith('calendar.')){
   const current=this.events.get(i.resourceId+'/'+plan.targetId);if(plan.etag&&current?.etag!==plan.etag)throw {response:{status:412}};
   this.events.set(i.resourceId+'/'+plan.targetId,{...current,id:plan.targetId,summary:i.name,description:i.description??'',etag:'"event-'+this.calls.length+'"',start:{dateTime:i.start},end:{dateTime:i.end},extendedProperties:{private:{...plan.previousPrivate,claraOsOperation:plan.marker}}});
  }else{
   const current=this.files.get(plan.targetId);if(plan.etag&&current?.etag!==plan.etag)throw {response:{status:412}};
   const content=i.content!==undefined?Buffer.from(i.content,'base64'):current!.content;
   this.files.set(plan.targetId,{id:plan.targetId,name:i.name,mimeType:current?.mimeType??i.mimeType!,version:String(Number(current?.version??0)+1),etag:'"file-'+this.calls.length+'"',parents:i.kind==='drive.update'?current!.parents:[i.resourceId],isAppAuthorized:true,trashed:false,capabilities:{canEdit:true,canAddChildren:false,canMoveItemWithinDrive:true,canDownload:true},appProperties:{...plan.previousProperties,claraOsOperation:plan.marker},md5Checksum:createHash('md5').update(content).digest('hex'),content});
  }
  this.onMutation?.();if(this.outcome==='lost-ack')throw Error('Synthetic acknowledgement lost after effect');
 }
}
