import {resolveMailSignature,type SignatureLocale} from './signatures';

/**
 * Pure draft preview preparation only. Does not persist, submit, approve or send.
 * The existing native SMTP envelope remains text/plain.
 */
const BEGIN='\n\n-- Mélodie Digital signature --\n';
const END='\n-- End Mélodie Digital signature --';

export function prepareSignedMailDraft(input:{sender:string;locale:SignatureLocale;body:string}){
 const signature=resolveMailSignature(input.sender,input.locale);
 if(!signature) return {body:input.body,signature:null,applied:false};
 // Preserve the authored message and replace an existing generated signature
 // rather than appending a duplicate after a second preview.
 const pos=input.body.indexOf(BEGIN);
 const clean=pos===-1?input.body:input.body.slice(0,pos);
 const body=clean+BEGIN+signature.text+END;
 return {body,signature,applied:true};
}
