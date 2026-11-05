import type {MailContent} from '@/lib/connectors/ionos/transport';

/** Read-only, bounded evidence selection inside an already SQL-authorized mailbox.
 * Subject matching is deliberately a fallback for separately composed "Re:" mail:
 * it does NOT assert that two messages form an authenticated RFC email thread.
 */
export type RelatedMail={id:string;content:MailContent};
const normalizeAddress=(s:string)=>s.trim().toLowerCase();
export function threadSubject(subject:string){
 let value=subject.trim();
 for(let i=0;i<5;i++){
  const next=value.replace(/^(?:re|aw|sv|tr)\s*:\s*/i,'').trim();
  if(next===value)break;
  value=next;
 }
 return value.normalize('NFC').toLocaleLowerCase().replace(/\s+/g,' ');
}
export function relevantMailboxHistory(
 current:MailContent,currentId:string,mailboxAddress:string,candidates:readonly RelatedMail[]
):Array<{subject:string;body:string;direction:'received'|'sent'}>{
 const subject=threadSubject(current.subject);
 const correspondent=normalizeAddress(current.from),mailbox=normalizeAddress(mailboxAddress);
 if(subject.length<8||!correspondent||correspondent===mailbox)return [];
 const seen=new Set<string>();
 const result:Array<{subject:string;body:string;direction:'received'|'sent'}>=[];
 for(const {id,content:msg} of candidates){
  if(result.length>=4)break;
  if(id===currentId||msg.quarantined||msg.folderKind==='junk'||msg.folderKind==='drafts'||!msg.text?.trim())continue;
  if(threadSubject(msg.subject)!==subject)continue;
  const from=normalizeAddress(msg.from),to=(msg.to||[]).map(normalizeAddress);
  const received=from===correspondent&&to.includes(mailbox);
  const sent=msg.folderKind==='sent'&&from===mailbox&&to.includes(correspondent);
  if(!received&&!sent)continue;
  if(msg.messageId&&current.messageId&&msg.messageId===current.messageId)continue;
  const fingerprint=msg.messageId||id;
  if(seen.has(fingerprint))continue;
  seen.add(fingerprint);
  result.push({subject:msg.subject.slice(0,300),body:msg.text.slice(0,1800),direction:sent?'sent':'received'});
 }
 return result;
}
