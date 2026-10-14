import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {nativeGoogleCommand,googleProofHash} from '@/lib/native/google-authority';
import {nativeFailure,nativeOperationFence} from '@/lib/native/authority';
import {fields,registryBody} from '@/lib/canonical/http';
import {opaque} from '@/lib/canonical/registry';
import {OAuthAuthorizationService} from '@/lib/auth/oauth/service';
import {createOAuthNonce} from '@/lib/auth/oauth/state';
import {oauthProviders} from '@/lib/auth/oauth/providers';
import {googleConfig} from '@/lib/config/google';
export const dynamic='force-dynamic';
export async function GET(request:Request){return await nativeOperationFence(request);}
export async function POST(request:Request){try{return await withNativeScope(request,true,async()=>{
 const body=await registryBody(request);fields(body,['connectionId']);const connectionId=body.connectionId?opaque(body.connectionId):randomUUID();
 const ctx=nativeContext()!,identity=await nativeGoogleCommand('identity'),nonce=createOAuthNonce();
 const authorization=new OAuthAuthorizationService(oauthProviders).create({provider:'google',connectionId,workspaceId:ctx.scope.workspaceId,nonce,redirectUri:googleConfig.redirectUri,redirectPath:'/documents',scopes:['openid','https://www.googleapis.com/auth/drive.readonly'],parameters:{nonce,prompt:'consent select_account',include_granted_scopes:'false'},native:{userId:String(identity.userId),clientId:ctx.scope.clientId,projectId:ctx.scope.projectId,sessionId:ctx.scope.sessionId}});
 await nativeGoogleCommand('begin',{connectionId,stateHash:googleProofHash(authorization.searchParams.get('state')!),nonceHash:googleProofHash(nonce)});
 const response=NextResponse.json({success:true,authorizationUrl:authorization.toString()});response.cookies.set('clara_google_oauth_nonce',nonce,{httpOnly:true,sameSite:'lax',secure:true,maxAge:600,path:'/api/connections/google/callback'});response.headers.set('Cache-Control','no-store');return response;
});}catch(error){return nativeFailure(error);}}
