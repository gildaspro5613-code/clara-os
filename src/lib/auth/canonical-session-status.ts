import { authorizeClaraRequest } from "./canonical-request-authorization";
export type CanonicalSessionStatus={authenticated:false;workspaceId:string}|{authenticated:true;workspaceId:string;userId:string};
export async function canonicalSessionStatus(cookieHeader:string|null,workspaceId:string):Promise<CanonicalSessionStatus>{const principal=await authorizeClaraRequest(cookieHeader,workspaceId,"connections:manage");return principal?{authenticated:true,workspaceId:principal.workspaceId,userId:principal.userId}:{authenticated:false,workspaceId};}
