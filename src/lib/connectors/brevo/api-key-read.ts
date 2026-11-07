import {BrevoClient,type BrevoFetch} from './client';
export type BrevoReadKind='contacts'|'lists'|'templates'|'campaigns';
export type BrevoReadSnapshot={kind:BrevoReadKind;count:number|null;items:Record<string,unknown>[];partial:boolean};
export function brevoReadKindFromMessage(message:string):BrevoReadKind|null{
 if(!/\bbrevo\b/i.test(message))return null;
 if(/contact|kontakte|contatti/i.test(message))return 'contacts';
 if(/list[aei]|listen|liste|elench/i.test(message))return 'lists';
 if(/mod[eè]le|template|plantilla|vorlage|modello/i.test(message))return 'templates';
 if(/campagn|campaign|kampagne|campaña/i.test(message))return 'campaigns';
 return null;
}
const validCount=(value:unknown):number|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
/** Exactly one hardcoded GET per user-authorized read, capped at ten records. */
export async function readBrevoBounded(kind:BrevoReadKind,apiKey:string,fetcher?:BrevoFetch):Promise<BrevoReadSnapshot>{
 if(!apiKey.trim())throw new Error('BREVO_API_KEY_NOT_CONFIGURED');
 const client=new BrevoClient({apiKey,fetch:fetcher});
 let items:Record<string,unknown>[]=[];
 let count:number|null=null;
 switch(kind){
  case 'contacts':{
   const data=await client.searchContacts({limit:10,offset:0});
   count=validCount(data.count);
   items=(data.contacts??[]).slice(0,10).map(c=>({id:c.id,email:c.email,listIds:Array.isArray(c.listIds)?c.listIds.slice(0,20):[]}));
   break;
  }
  case 'lists':{
   const data=await client.readLists({limit:10,offset:0});
   count=validCount(data.count);
   items=(data.lists??[]).slice(0,10).map(c=>({id:c.id,name:c.name,uniqueSubscribers:c.uniqueSubscribers}));
   break;
  }
  case 'templates':{
   const data=await client.searchTemplates({limit:10,offset:0});
   count=validCount(data.count);
   items=(data.templates??[]).slice(0,10).map(c=>({id:c.id,name:c.name,subject:c.subject,isActive:c.isActive}));
   break;
  }
  case 'campaigns':{
   const data=await client.listCampaigns({limit:10,offset:0});
   count=validCount(data.count);
   items=(data.campaigns??[]).slice(0,10).map(c=>({id:c.id,name:c.name,status:c.status,subject:c.subject}));
   break;
  }
  default:throw Error('BREVO_READ_KIND_INVALID');
 }
 return {kind,count,items,partial:count!==null?count>items.length:items.length>=10};
}
