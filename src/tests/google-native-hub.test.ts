import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGoogleHubState} from '@/components/connections/google-native-status';
const row=(id='a',status='ACTIVE',owned=true)=>({id,status,owned,revision:1});
const list=(connections:unknown[]=[],selectedConnectionId:unknown=null)=>({success:true,connections,selectedConnectionId});
test('native ACTIVE is registered/selected, never a provider certification or an automatic selection',()=>{
 assert.equal(nativeGoogleHubState(list([row()]),200),'selectionRequired');
 assert.equal(nativeGoogleHubState(list([row()],'a'),200),'selected');
 assert.equal(nativeGoogleHubState(list([row('a','ACTIVE',false)],'a'),200),'selected','Authorized delegate has the same presentation; API remains authority');
});
test('selected reconnect/pending cannot fall back to another active account',()=>{
 assert.equal(nativeGoogleHubState(list([row('a','RECONNECT_REQUIRED'),row('b')],'a'),200),'reconnect');
 assert.equal(nativeGoogleHubState(list([row('a','PENDING_AUTHENTICATION'),row('b')],'a'),200),'pending');
 assert.equal(nativeGoogleHubState(list([row('b')],'revoked-a'),200),'selectionUnavailable');
});
test('missing selection, missing authority, reconnect and pending are distinct',()=>{
 assert.equal(nativeGoogleHubState(list(),200),'none');
 assert.equal(nativeGoogleHubState(list([row('a','RECONNECT_REQUIRED')]),200),'reconnect');
 assert.equal(nativeGoogleHubState(list([row('a','PENDING_AUTHENTICATION')]),200),'pending');
 assert.equal(nativeGoogleHubState(list([row('a','RECONNECT_REQUIRED'),row('b')]),200),'selectionRequired');
});
test('HTTP refusal dominates an apparently ACTIVE payload and public authority errors are preserved',()=>{
 assert.equal(nativeGoogleHubState(list([row()],'a'),401),'authRequired');
 assert.equal(nativeGoogleHubState(list([row()],'a'),403),'denied');
 assert.equal(nativeGoogleHubState(list([row()],'a'),503),'unavailable');
 for(const code of ['NATIVE_SCOPE_DENIED','NATIVE_GOOGLE_SCOPE_DENIED','NATIVE_GOOGLE_OWNER_SCOPE_DENIED'])assert.equal(nativeGoogleHubState({success:false,code},200),'denied');
 assert.equal(nativeGoogleHubState({success:false,code:'AUTHENTICATED_OS_SESSION_REQUIRED'},200),'authRequired');
});
test('malformed, duplicate, unknown-status and historical connected flags cannot imply a native connection',()=>{
 for(const value of [null,{},[],{connected:true,status:'ACTIVE'},list([row('a','UNKNOWN')]),list([row(),row()]),list([{id:'a',status:'ACTIVE'}]),list([null]),list([row()],{}),list([row()],''),{success:true,connections:[row()]},{success:false,connections:[row()],selectedConnectionId:'a',code:{toString:null}}])assert.equal(nativeGoogleHubState(value,200),'unavailable');
 assert.equal(nativeGoogleHubState(list([row()],'a'),Number.NaN),'unavailable');
});
