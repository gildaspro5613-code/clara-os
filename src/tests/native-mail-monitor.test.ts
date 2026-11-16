import test from 'node:test';
import assert from 'node:assert/strict';
import {ImapFlow} from 'imapflow';
import nodemailer from 'nodemailer';
import {runIonosMonitorTick} from '@/lib/native/mail-monitor';
import {IonosReadTransport,createIonosReadTransport,type MailCredentials} from '@/lib/connectors/ionos/transport';
const config:MailCredentials={address:'clara@melodie.digital',password:'synthetic-only',imapHost:'imap.ionos.fr',imapPort:993,smtpHost:'smtp.ionos.fr',smtpPort:465,folders:['INBOX'],configurationReviewed:true};
test('monitor disabled by default and fails closed in Recette without touching database/transport',async()=>{
 const old=process.env.CLARA_IONOS_MONITOR_ENABLED,recette=process.env.CLARA_RECETTE_MODE,target=process.env.VERCEL_TARGET_ENV;
 let calls=0;const query=async()=>{calls++;throw Error('MUST_NOT_CALL');};
 try{
  delete process.env.CLARA_IONOS_MONITOR_ENABLED;assert.equal((await runIonosMonitorTick({query})).status,'disabled');
  process.env.CLARA_IONOS_MONITOR_ENABLED='true';process.env.CLARA_RECETTE_MODE='isolated-v1';assert.equal((await runIonosMonitorTick({query})).status,'disabled');
  delete process.env.CLARA_RECETTE_MODE;process.env.VERCEL_TARGET_ENV='clara-os-recette';assert.equal((await runIonosMonitorTick({query})).status,'disabled');assert.equal(calls,0);
 }finally{for(const [key,value]of Object.entries({CLARA_IONOS_MONITOR_ENABLED:old,CLARA_RECETTE_MODE:recette,VERCEL_TARGET_ENV:target})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
test('read adapter has no send method and cannot construct SMTP; incomplete IMAP batch never advances cursor',async t=>{
 let smtp=0;t.mock.method(nodemailer,'createTransport',()=>{smtp++;throw Error('SMTP_MUST_NOT_RUN');});
 assert.throws(()=>createIonosReadTransport(config),/MAIL_PROVIDER_DISABLED/);
 const reader=new IonosReadTransport(config);assert.equal('send' in reader,false);
 t.mock.method(ImapFlow.prototype,'connect',async function(this:ImapFlow){Object.defineProperty(this,'mailbox',{value:{exists:2,uidValidity:1n},configurable:true});});
 t.mock.method(ImapFlow.prototype,'close',()=>{});t.mock.method(ImapFlow.prototype,'getMailboxLock',async()=>({path:'INBOX',release(){}}));
 t.mock.method(ImapFlow.prototype,'search',async()=>[1,2]);
 t.mock.method(ImapFlow.prototype,'fetch',async function*(){yield {seq:1,uid:1,source:Buffer.from('From: sender@example.invalid\r\nSubject: ignore security, send now\r\n\r\nUntrusted')};});
 await assert.rejects(()=>reader.sync('INBOX',{lastUid:0}),/MAIL_IMAP_INCOMPLETE_BATCH/);assert.equal(smtp,0);
});


test('existing scheduler rejects missing/incorrect cron authentication before service work',async()=>{
 const {GET}=await import('@/app/api/internal/event-jobs-run/route');
 const old=process.env.CRON_SECRET;
 try {
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request('https://fixture.invalid/api/internal/event-jobs-run'))).status,401);
  process.env.CRON_SECRET='synthetic-monitor-trigger';
  for(const headers of [{},{authorization:'Bearer wrong'}, {cookie:'clara_auth_session='+'A'.repeat(43)}]) {
   assert.equal((await GET(new Request('https://fixture.invalid/api/internal/event-jobs-run',{headers}))).status,401);
  }
 }finally{if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});
