import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";
import {ImapFlow} from 'imapflow';
import nodemailer from 'nodemailer';
import {simpleParser} from 'mailparser';
import {createHash} from 'node:crypto';

export interface MailAttachment {id:string;name:string;type:string;size:number;sha256:string;content:string}
export interface MailContent {subject:string;from:string;to:string[];text:string;messageId:string;attachments:MailAttachment[];quarantined:boolean}
export interface MailCredentials {address:string;password:string;imapHost:string;imapPort:number;smtpHost:string;smtpPort:number;folders:string[];configurationReviewed:boolean}
export interface MailCursor {uidValidity?:string;lastUid:number}
export interface MailSync {uidValidity:string;uids:number[];lastUid:number;messages:Array<{uid:number;content:MailContent}>}
export interface MailEnvelope {from:string;to:string[];subject:string;text:string;messageId:string;inReplyTo?:string;attachments:MailAttachment[]}
export interface MailTransport {
 folders():Promise<string[]>;
 sync(folder:string,cursor:MailCursor):Promise<MailSync>;
 exists(folder:string,validity:string,uid:number):Promise<boolean>;
 send(envelope:MailEnvelope):Promise<'sent'|'failed'|'uncertain'>;
}
export const MAIL_LIMIT=1024*1024;
export function mailAddress(value:string){if(value.length>254||!/^[-a-zA-Z0-9.!#$%&'*+/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))throw Error('MAIL_INVALID_ADDRESS');return value;}
export async function parseMail(source:Buffer):Promise<MailContent>{
 if(source.length>MAIL_LIMIT)throw Error('MAIL_SOURCE_LIMIT');
 const parsed=await simpleParser(source,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true});
 const attachments:MailAttachment[]=[];let quarantined=false,total=0;
 for(const item of parsed.attachments){
  total+=item.size;
  if(attachments.length>=8||item.size>256*1024||total>512*1024||!['application/pdf','text/plain'].includes(item.contentType)||/[\r\n/\\\x00-\x1f]/.test(item.filename??'')||/\.(exe|js|html|svg|scr|bat|cmd|zip|docm)$/i.test(item.filename??'')){quarantined=true;continue;}
  const sha256=createHash('sha256').update(item.content).digest('hex');attachments.push({id:sha256,name:(item.filename??'attachment').slice(0,120),type:item.contentType,size:item.size,sha256,content:item.content.toString('base64')});
 }
 const address=parsed.from?.value[0]?.address??'';
 const to=(Array.isArray(parsed.to)?parsed.to:parsed.to?[parsed.to]:[]).flatMap(x=>x.value.map(a=>a.address??''));
 return {subject:(parsed.subject??'').replace(/[\r\n]/g,' ').slice(0,300),from:address,to,text:(parsed.text??'').slice(0,32000),messageId:(parsed.messageId??'').replace(/[\r\n]/g,'').slice(0,250),attachments:quarantined?[]:attachments,quarantined};
}
export function validateMailConfig(c:MailCredentials){
 if(!c.configurationReviewed||!['clara@melodie.digital','gildas@melodie.digital'].includes(c.address)||!c.password||c.password.length>4096||c.imapPort!==993||![465,587].includes(c.smtpPort)||!Array.isArray(c.folders)||c.folders.length<1||c.folders.length>10)throw Error('MAIL_CONFIGURATION_REQUIRED');
 for(const host of [c.imapHost,c.smtpHost])if(!/^[a-z0-9-]+\.(?:ionos\.(?:fr|com|de|co\.uk))$/.test(host))throw Error('MAIL_HOST_NOT_APPROVED');
 for(const folder of c.folders)if(!folder||folder.length>200||/[\x00-\x1f]/.test(folder))throw Error('MAIL_INVALID_FOLDER');
}
/** Network activation is deliberately OFF unless separately configured after
 * provider certification. Tests inject a transport and never set this flag. */
export function createIonosTransport(credentials:MailCredentials):MailTransport{
 if(process.env.CLARA_IONOS_NETWORK_ENABLED!=='true')throw Error('MAIL_PROVIDER_DISABLED');
 validateMailConfig(credentials);return new IonosTransport(credentials);
}
export class IonosTransport implements MailTransport {
 constructor(private readonly credentials:MailCredentials){validateMailConfig(credentials);}
 private client(){const c=this.credentials;return new ImapFlow({host:c.imapHost,port:c.imapPort,secure:true,auth:{user:c.address,pass:c.password},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},logger:false,disableAutoIdle:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});}
 private async imap<T>(work:(client:ImapFlow)=>Promise<T>){assertRecetteExternalExecutionBlocked('ionos.imap');const client=this.client();let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([(async()=>{await client.connect();return work(client);})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{client.close();reject(Error('MAIL_IMAP_TIMEOUT'));},30000);})]);}finally{clearTimeout(timer);client.close();}}
 async folders(){return this.imap(async client=>(await client.list()).map(f=>f.path).filter(f=>this.credentials.folders.includes(f)));}
 async exists(folder:string,validity:string,uid:number){if(!this.credentials.folders.includes(folder))throw Error('MAIL_FOLDER_DENIED');return this.imap(async client=>{const lock=await client.getMailboxLock(folder,{readOnly:true});try{if(!client.mailbox||String(client.mailbox.uidValidity)!==validity)return false;const found=await client.fetchOne(String(uid),{uid:true},{uid:true});return !!found&&found.uid===uid;}finally{lock.release();}});}
 async sync(folder:string,cursor:MailCursor):Promise<MailSync>{
  if(!this.credentials.folders.includes(folder))throw Error('MAIL_FOLDER_DENIED');
  return this.imap(async client=>{const lock=await client.getMailboxLock(folder,{readOnly:true});try{
   if(!client.mailbox||client.mailbox.exists>5000)throw Error('MAIL_FOLDER_LIMIT');
   const uidValidity=String(client.mailbox.uidValidity),uids=(await client.search({all:true},{uid:true}))||[];
   if(uids.length>5000)throw Error('MAIL_FOLDER_LIMIT');
   const start=cursor.uidValidity===uidValidity?cursor.lastUid:0,selected=uids.filter(u=>u>start).sort((a,b)=>a-b).slice(0,25),messages:MailSync['messages']=[];
   if(selected.length)for await(const item of client.fetch(selected,{uid:true,source:{start:0,maxLength:MAIL_LIMIT+1}},{uid:true})){if(!item.source||item.source.length>MAIL_LIMIT)throw Error('MAIL_SOURCE_LIMIT');messages.push({uid:item.uid,content:await parseMail(item.source)});}
   return {uidValidity,uids,lastUid:selected.length?Math.max(...selected):start,messages};
  }finally{lock.release();}});
 }
 async send(envelope:MailEnvelope):Promise<'sent'|'failed'|'uncertain'>{assertRecetteExternalExecutionBlocked('ionos.smtp');
  const c=this.credentials;if(envelope.from!==c.address)throw Error('MAIL_SENDER_DENIED');
  const transport=nodemailer.createTransport({host:c.smtpHost,port:c.smtpPort,secure:c.smtpPort===465,requireTLS:true,auth:{user:c.address,pass:c.password},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  try{const info=await transport.sendMail({from:mailAddress(envelope.from),to:envelope.to.map(mailAddress),subject:envelope.subject,text:envelope.text,messageId:envelope.messageId,inReplyTo:envelope.inReplyTo,attachments:envelope.attachments.map(a=>({filename:a.name,content:Buffer.from(a.content,'base64'),contentType:a.type})),disableFileAccess:true,disableUrlAccess:true});return info.accepted.length===envelope.to.length?'sent':'uncertain';}
  catch(error){const e=error as {code?:string;command?:string};return ['EAUTH','EDNS'].includes(e.code??'')||(e.code==='ECONNECTION'&&e.command==='CONN')?'failed':'uncertain';}
  finally{transport.close();}
 }
}
