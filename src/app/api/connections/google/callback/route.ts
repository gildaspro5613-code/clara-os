import {NextResponse} from 'next/server';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {nativeGoogleCommand,googleProofHash,scopedGoogleCredentialStore,scopedGoogleRepository} from '@/lib/native/google-authority';
import {verifyOAuthState} from '@/lib/auth/oauth/state';
import {verifyGoogleIdToken} from '@/lib/auth/google-sign-in';
import {OAuthError} from '@/lib/auth/oauth/error';
import {OAuthCallbackService} from '@/lib/auth/oauth/service';
import {oauthProviders} from '@/lib/auth/oauth/providers';
import {googleConfig} from '@/lib/config/google';
import {RegistryError} from '@/lib/canonical/registry';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return await withNativeScope(request,false,async()=>{
 const url=new URL(request.url),stateValue=url.searchParams.get('state')??'',code=url.searchParams.get('code');
 const nonces=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('clara_google_oauth_nonce='));
 if(nonces.length!==1)throw new RegistryError(403,'NATIVE_GOOGLE_OAUTH_TRANSACTION_DENIED');const nonce=decodeURIComponent(nonces[0].slice('clara_google_oauth_nonce='.length));
 const state=verifyOAuthState(stateValue,{nonce,provider:'google'}),ctx=nativeContext()!,scope=ctx.scope;
 if(state.workspaceId!==scope.workspaceId||state.native?.userId!==ctx.userId||state.native.clientId!==scope.clientId||state.native.projectId!==scope.projectId||state.native.sessionId!==scope.sessionId)throw new RegistryError(403,'NATIVE_GOOGLE_OAUTH_CONTEXT_CHANGED');
 const transaction={stateHash:googleProofHash(stateValue),nonceHash:googleProofHash(nonce)};
 const authority=await nativeGoogleCommand('callback',{connectionId:state.connectionId,...transaction});
 const verified={...transaction,issuer:'',subject:''};
 const store=scopedGoogleCredentialStore(state.connectionId,undefined,verified);
 await new OAuthCallbackService(oauthProviders,scopedGoogleRepository(state.connectionId,transaction),store).complete({provider:'google',state:stateValue,nonce,code,redirectUri:googleConfig.redirectUri,workspaceId:scope.workspaceId,validateTokens:async tokens=>{
  if(!tokens.idToken)throw new RegistryError(403,'NATIVE_GOOGLE_IDENTITY_REQUIRED');
  const claims=await verifyGoogleIdToken(tokens.idToken,nonce,googleConfig.clientId).catch(error=>{if(error instanceof Error&&/^(INVALID|EXPIRED)_GOOGLE_/.test(error.message))throw new RegistryError(403,'NATIVE_GOOGLE_IDENTITY_DENIED');throw error;});
  if(claims.sub!==authority.subject)throw new RegistryError(403,'NATIVE_GOOGLE_PRINCIPAL_CHANGED');
  verified.issuer='https://accounts.google.com';verified.subject=claims.sub!;delete tokens.idToken;
 }});
 const origin=process.env.CLARA_AUTH_APP_ORIGIN;if(!origin)throw new RegistryError(503,'NATIVE_GOOGLE_CALLBACK_ORIGIN_REQUIRED');
 const response=NextResponse.redirect(new URL('/documents',origin));response.cookies.set('clara_google_oauth_nonce','',{httpOnly:true,sameSite:'lax',secure:true,maxAge:0,path:'/api/connections/google/callback'});response.headers.set('Cache-Control','no-store');return response;
});}catch(error){if(error instanceof OAuthError&&['INVALID_STATE','EXPIRED_STATE','PROVIDER_MISMATCH','CONNECTION_MISMATCH','MISSING_AUTHORIZATION_CODE'].includes(error.code))return nativeFailure(new RegistryError(403,'NATIVE_GOOGLE_OAUTH_TRANSACTION_DENIED'));return nativeFailure(error);}}
