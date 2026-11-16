/** UI projection only: preserve the existing stored signature delimiters byte for byte. */
const start='\n\n-- Mélodie Digital signature --\n';
const end='\n-- End Mélodie Digital signature --';
export function splitMailSignature(body:string){
 const pos=body.indexOf(start);
 if(pos<0||!body.endsWith(end)||body.indexOf(start,pos+start.length)!==-1)return {message:body,signature:null};
 return {message:body.slice(0,pos),signature:body.slice(pos+start.length,-end.length)};
}
export function joinMailSignature(message:string,signature:string|null){
 return signature===null?message:message+start+signature+end;
}
export function displayMailText(body:string){
 const {message,signature}=splitMailSignature(body);
 return signature===null?message:message+'\n\n'+signature;
}
