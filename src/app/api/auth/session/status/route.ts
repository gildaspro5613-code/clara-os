import { NextResponse,type NextRequest } from "next/server";
import { canonicalSessionStatus } from "@/lib/auth/canonical-session-status";
export const dynamic="force-dynamic";
function configuredWorkspaceId():string{return process.env.CLARA_MD_WORKSPACE_ID?.trim()||process.env.CLARA_WORKSPACE_ID?.trim()||"melodie-digital";}
export async function GET(request:NextRequest){const status=await canonicalSessionStatus(request.headers.get("cookie"),configuredWorkspaceId());return NextResponse.json(status,{headers:{"Cache-Control":"no-store"}});}
