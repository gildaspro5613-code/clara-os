import { authorizeClaraRequest,readAuthCookie } from "@/lib/auth/canonical-request-authorization";
import type { WorkspacePermission } from "@/lib/auth/workspace-authorization";
export { readAuthCookie };
export async function authorizeMicrosoftRequest(cookieHeader:string|null,serverSelectedWorkspaceId:string,permission:WorkspacePermission):Promise<{userId:string;workspaceId:string}|null>{return authorizeClaraRequest(cookieHeader,serverSelectedWorkspaceId,permission);}
