export class RegistryListFailure extends Error {
 constructor(public readonly status:number){super('REGISTRY_LIST_UNAVAILABLE');}
}
/** Empty data is a valid result only for an explicitly successful response. */
export async function checkedRegistryList<T>(response:Response):Promise<T[]>{
 if(!response.ok)throw new RegistryListFailure(response.status);
 let body;try{body=await response.json();}catch{throw new RegistryListFailure(503);}
 if(body?.success!==true||!Array.isArray(body.data))throw new RegistryListFailure(503);
 return body.data;
}
export function registryListMessage(error:unknown){
 const status=error instanceof RegistryListFailure?error.status:503;
 return status===401?'signInToViewAuthorizedProjects':status===403?'nativeContextForbidden':status>=500?'nativeContextUnavailable':'nativeSelectionError';
}
