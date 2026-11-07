import { nativeFailure } from "@/lib/native/authority";
import {nativeContext,withNativeScope} from "@/lib/native/scoped-context";
import {RegistryError} from "@/lib/canonical/registry";
import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { toPublicBrevoConnection } from "@/lib/connections/brevo-connection-public";
import {brevoReadOAuthStatus} from "@/lib/connectors/brevo/read-oauth-status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try{
    return await withNativeScope(request,false,async()=>{
      if(nativeContext()?.scope.workspaceId!==CURRENT_WORKSPACE_ID)throw new RegistryError(403,'BREVO_WORKSPACE_DENIED');
      const connection=await new DatabaseConnectionRepository().findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID,'brevo');
      return NextResponse.json({...toPublicBrevoConnection(connection),
        apiKeyConfigured:Boolean(process.env.BREVO_API_KEY?.trim()),
        oauthReady:brevoReadOAuthStatus().ready,
      },{headers:{'Cache-Control':'private, no-store'}});
    });
  }catch(error){return nativeFailure(error);}
}
