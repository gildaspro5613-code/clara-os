import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyGoogleIdToken} from '@/lib/auth/google-sign-in';
import {signOAuthState,verifyOAuthState} from '@/lib/auth/oauth/state';
import {OAuthCallbackService} from '@/lib/auth/oauth/service';
import {OAuthProviderRegistry} from '@/lib/auth/oauth/registry';
import {CredentialStore} from '@/lib/connections/credential-store';
import {ConnectionStatus} from '@/lib/connections/connection';

test('Google connector reuses canonical RS256 issuer/subject validation; nonce, audience, expiry, forged keys and account substitution are rejected before credential mutation',async t=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'isolated-key',use:'sig'};
 let jwksCalls=0;t.mock.method(globalThis,'fetch',async(input:string|URL)=>{assert.equal(String(input),'https://www.googleapis.com/oauth2/v3/certs');jwksCalls++;return Response.json({keys:[jwk]});});
 const now=Math.floor(Date.now()/1000),claims={iss:'https://accounts.google.com',sub:'canonical-google-owner',aud:'synthetic-client',exp:now+300,iat:now,nonce:'synthetic-nonce'};
 const jwt=(values:Record<string,unknown>=claims,key=pair.privateKey)=>{const parts=[Buffer.from(JSON.stringify({alg:'RS256',kid:'isolated-key'})).toString('base64url'),Buffer.from(JSON.stringify(values)).toString('base64url')].join('.');return parts+'.'+sign('RSA-SHA256',Buffer.from(parts),key).toString('base64url');};
 assert.equal((await verifyGoogleIdToken(jwt(),'synthetic-nonce','synthetic-client')).sub,claims.sub);
 for(const changed of [{iss:'https://evil.invalid'},{aud:'another-client'},{azp:'another-client'},{nonce:'another-nonce'},{exp:now-1},{sub:{email:'never infer identity'}},{iat:'invalid'}])await assert.rejects(()=>verifyGoogleIdToken(jwt({...claims,...changed}),'synthetic-nonce','synthetic-client'));
 const other=generateKeyPairSync('rsa',{modulusLength:2048});await assert.rejects(()=>verifyGoogleIdToken(jwt(claims,other.privateKey),'synthetic-nonce','synthetic-client'));
 let writes=0,statusWrites=0,exchanges=0;
 const credentials=new CredentialStore({load:async()=>null,save:async()=>{writes++;}},Buffer.alloc(32,11));
 const providers=new OAuthProviderRegistry([{id:'google',defaultScopes:['openid'],requiresRefreshToken:true,buildAuthorizationUrl:()=>new URL('https://accounts.google.com/'),exchangeCode:async()=>{exchanges++;return {accessToken:'synthetic-access',refreshToken:'synthetic-refresh',idToken:jwt({...claims,sub:'foreign-google-account'})};},refresh:async()=>({accessToken:'synthetic'})}]);
 const repo={findById:async()=>({id:'connection',workspaceId:'w',provider:'google',status:ConnectionStatus.PENDING_AUTHENTICATION,scopes:['openid'],createdAt:new Date(),updatedAt:new Date()}),findByWorkspaceAndProvider:async()=>null,save:async()=>{throw Error('must not write');},updateStatus:async()=>{statusWrites++;}};
 const state=signOAuthState({provider:'google',workspaceId:'w',connectionId:'connection',nonce:claims.nonce,expiresAt:Date.now()+300000,redirectPath:'/documents'},'test-state-key');
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY='test-state-key';
 await assert.rejects(()=>new OAuthCallbackService(providers,repo,credentials).complete({provider:'google',workspaceId:'w',redirectUri:'https://isolated.invalid/callback',state,nonce:claims.nonce,code:'synthetic',validateTokens:async tokens=>{const identity=await verifyGoogleIdToken(tokens.idToken!,claims.nonce,'synthetic-client');if(identity.sub!==claims.sub)throw Error('NATIVE_GOOGLE_PRINCIPAL_CHANGED');}}),/PRINCIPAL_CHANGED/);
 assert.equal(exchanges,1);assert.equal(writes,0);assert.equal(statusWrites,0);assert.ok(jwksCalls>=10);
 for(const expiresAt of [NaN,Infinity,Date.now()-1]){const invalid=signOAuthState({provider:'google',workspaceId:'w',connectionId:'connection',nonce:claims.nonce,expiresAt,redirectPath:'/documents'},'test-state-key');assert.throws(()=>verifyOAuthState(invalid,{provider:'google',nonce:claims.nonce},'test-state-key'));}
});
