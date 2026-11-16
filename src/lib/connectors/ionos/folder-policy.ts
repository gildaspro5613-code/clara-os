/** Bounded, read-only IONOS IMAP folder discovery.
 * Only INBOX or recognized special-use folders can be exposed.
 * Unknown provider folders remain inaccessible, even when returned by LIST.
 */
export type MailFolderKind='inbox'|'sent'|'junk'|'drafts'|'archive';
export type ImapFolderDescriptor={path:string;specialUse?:string|null};
const names:Record<Exclude<MailFolderKind,'inbox'>,readonly string[]>={
 sent:['sent','sent items','sent messages','gesendet','gesendete elemente','envoyés','elements envoyes','éléments envoyés','posta inviata','enviados'],
 junk:['junk','spam','junk e-mail','junk email','indésirables','courrier indésirable','unerwünscht','spamverdacht','posta indesiderata','correo no deseado'],
 drafts:['drafts','draft','brouillons','entwürfe','bozze','borradores'],
 archive:['archive','archives','archiv','archivio','archivados']
};
const special:Record<string,MailFolderKind>={'\\sent':'sent','\\junk':'junk','\\drafts':'drafts','\\archive':'archive'};
export function mailFolderKind(folder:ImapFolderDescriptor):MailFolderKind|null{
 const path=folder.path;
 if(!path||path.length>200||/[\x00-\x1f\x7f]/.test(path))return null;
 if(path.toUpperCase()==='INBOX')return 'inbox';
 const flag=folder.specialUse?.toLowerCase();
 if(flag&&special[flag])return special[flag];
 // Match an exact last component of a provider-listed IMAP path; do not
 // interpret arbitrary folder names or give unrestricted folder traversal.
 const last=path.split(/[/.]/).at(-1)?.normalize('NFC').trim().toLowerCase()??'';
 for(const [kind,aliases] of Object.entries(names))
  if(aliases.includes(last))return kind as MailFolderKind;
 return null;
}
export function authorizedMailFolders(folders:readonly ImapFolderDescriptor[]):Array<{path:string;kind:MailFolderKind}>{
 if(folders.length>100)throw Error('MAIL_FOLDER_LIMIT');
 const result:Array<{path:string;kind:MailFolderKind}>=[];
 for(const folder of folders){
  const kind=mailFolderKind(folder);
  if(kind&&!result.some(p=>p.path===folder.path))result.push({path:folder.path,kind});
 }
 if(result.length>10)throw Error('MAIL_FOLDER_LIMIT');
 return result;
}
