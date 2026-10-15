import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {ImapFlow} from 'imapflow';
import {parseMail,validateMailConfig,createIonosTransport,IonosTransport,MAIL_LIMIT,type MailCredentials,type MailEnvelope} from '@/lib/connectors/ionos/transport';
const config:MailCredentials={address:'clara@melodie.digital',password:'synthetic-only',imapHost:'imap.ionos.fr',imapPort:993,smtpHost:'smtp.ionos.fr',smtpPort:465,folders:['INBOX'],configurationReviewed:true};
test('IONOS network is off by default, no self-activation or guessed configuration',()=>{
 assert.notEqual(process.env.CLARA_IONOS_NETWORK_ENABLED,'true');assert.throws(()=>createIonosTransport(config),/DISABLED/);
 for(const c of [{...config,configurationReviewed:false},{...config,imapHost:'127.0.0.1'},{...config,smtpHost:'attacker.invalid'},{...config,smtpPort:25},{...config,imapPort:143},{...config,address:'support@melodie.digital'}])assert.throws(()=>validateMailConfig(c));
 validateMailConfig(config);
});
test('MIME decoding: plain text only, HTML never rendered or executed; oversized source rejected',async()=>{
 const r=await parseMail(Buffer.from('From: Sender <sender@example.invalid>\r\nTo: clara@melodie.digital\r\nSubject: Hello\r\nContent-Type: text/html\r\n\r\n<script>sendMail()</script><img src="https://attacker.invalid/track">'));
 assert.equal(r.text,'');assert.equal(r.from,'sender@example.invalid');await assert.rejects(()=>parseMail(Buffer.alloc(MAIL_LIMIT+1)),/LIMIT/);
});
test('MIME dangerous and excessive attachments are quarantined, no unsafe bytes exposed',async()=>{
 const message=(type:string,name:string,bytes:Buffer)=>Buffer.from(`From: sender@example.invalid\r\nContent-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\nContent-Type: text/plain\r\n\r\nSafe text\r\n--x\r\nContent-Type: ${type}\r\nContent-Disposition: attachment; filename="${name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${bytes.toString('base64')}\r\n--x--`);
 for(const [type,name,bytes]of [['application/javascript','attack.js',Buffer.from('x')],['text/plain','large.txt',Buffer.alloc(256*1024+1)]] as const){const r=await parseMail(message(type,name,bytes));assert.equal(r.quarantined,true);assert.deepEqual(r.attachments,[]);}
 const safe=await parseMail(message('text/plain','notes.txt',Buffer.from('Safe notes')));assert.equal(safe.quarantined,false);assert.equal(safe.attachments[0].size,10);assert.match(safe.attachments[0].sha256,/^[a-f0-9]{64}$/);
});
test('actual IMAP adapter uses read-only locking, bounded partial fetch and UIDVALIDITY incremental resume',async t=>{
 let fetched:unknown,closed=0,released=0;
 t.mock.method(ImapFlow.prototype,'connect',async function(this:ImapFlow){Object.defineProperty(this,'mailbox',{value:{path:'INBOX',exists:2,uidValidity:17n},configurable:true});});
 t.mock.method(ImapFlow.prototype,'close',()=>{closed++;});
 t.mock.method(ImapFlow.prototype,'getMailboxLock',async(_path,options)=>{assert.equal(options?.readOnly,true);return {path:'INBOX',release(){released++;}};});
 t.mock.method(ImapFlow.prototype,'search',async()=>[1,2]);
 t.mock.method(ImapFlow.prototype,'fetch',async function*(range,query,options){assert.deepEqual(range,[2]);assert.equal(options?.uid,true);fetched=query.source;yield {seq:2,uid:2,source:Buffer.from('From: sender@example.invalid\r\nSubject: Approved source\r\n\r\nSafe text')};});
 t.mock.method(ImapFlow.prototype,'fetchOne',async()=>({seq:2,uid:2}));
 const adapter=new IonosTransport(config),result=await adapter.sync('INBOX',{uidValidity:'17',lastUid:1});assert.deepEqual(fetched,{start:0,maxLength:MAIL_LIMIT+1});assert.equal(result.messages.length,1);assert.equal(result.lastUid,2);assert.equal(result.uidValidity,'17');assert.equal(await adapter.exists('INBOX','old-validity',2),false);assert.equal(await adapter.exists('INBOX','17',2),true);assert.ok(closed>=3);assert.equal(released,3);
 await assert.rejects(()=>adapter.sync('private-folder',{lastUid:0}),/FOLDER_DENIED/);
});
test('actual SMTP adapter freezes identity and bytes, enforces verified TLS, no URL/file access, no retry',async t=>{
 let calls=0;const options:object[]=[];const envelope:MailEnvelope={from:config.address,to:['recipient@example.invalid'],subject:'Approved',text:'Exact content',messageId:'<stable@example.invalid>',attachments:[]};
 t.mock.method(nodemailer,'createTransport',(configuration:object)=>{options.push(configuration);return {sendMail:async (sent:MailEnvelope)=>{calls++;assert.equal(sent.messageId,envelope.messageId);assert.equal(sent.from,envelope.from);return {accepted:envelope.to};},close(){}};});
 assert.equal(await new IonosTransport(config).send(envelope),'sent');assert.equal(calls,1);const o=options[0] as {requireTLS:boolean;tls:{rejectUnauthorized:boolean};disableFileAccess:boolean;disableUrlAccess:boolean};assert.equal(o.requireTLS,true);assert.equal(o.tls.rejectUnauthorized,true);assert.equal(o.disableFileAccess,true);assert.equal(o.disableUrlAccess,true);
 await assert.rejects(()=>new IonosTransport(config).send({...envelope,from:'gildas@melodie.digital'}),/SENDER/);assert.equal(calls,1);
});
for(const [code,state] of [['EAUTH','failed'],['ECONNECTION','failed'],['ETIMEDOUT','uncertain'],['ESOCKET','uncertain']] as const)test(`SMTP ${code}: ${state}, single attempt only`,async t=>{
 let calls=0;t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{calls++;throw {code,command:'CONN'};},close(){}}));const r=await new IonosTransport(config).send({from:config.address,to:['recipient@example.invalid'],subject:'Approved',text:'Exact',messageId:'<stable@example.invalid>',attachments:[]});assert.equal(r,state);assert.equal(calls,1);
});
