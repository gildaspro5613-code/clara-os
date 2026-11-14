import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function incident276(scale=1){
 const wire=JSON.parse(readFileSync('docs/reception/issue-276/sanitized-event.json','utf8'));
 if(scale===1)return wire;
 const business=wire.context.activePreparation.businessContext;
 for(const domain of ['sound','video','structure','production']){
  const sheet=business.worksheets[domain],original=sheet.content.rows;
  sheet.content.rows=Array.from({length:Math.min(scale,20)},(_,batch)=>original.map((row:Record<string,unknown>)=>({...row,id:batch?`${row.id}-${batch}`:row.id,notes:(row.notes??'')+' · référence synthétique '+createHash('sha256').update(domain+batch+row.id).digest('hex')}))).flat();
 }
 const doc=wire.context.projectContext.documents[0];wire.context.projectContext.documents=Array.from({length:Math.min(scale,20)},(_,i)=>({...doc,id:i?'doc-'+i:doc.id,filename:`Fiche-${i}.txt`,text:doc.text+' '+i}));
 wire.context.activePreparation.businessContext.revision=createHash('sha256').update(JSON.stringify(business.worksheets)).digest('hex');
 for(const sheet of Object.values(business.worksheets) as Record<string,unknown>[])sheet.base_revision=business.revision;
 wire.scope.sessionId='complexity-'+scale;
 return wire;
}
