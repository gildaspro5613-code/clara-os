#!/usr/bin/env node
/**
 * Read-only cross-repository signature registry drift check.
 * GET only; never modifies GitHub, IONOS, or OS runtime.
 * Requires GITHUB_TOKEN with explicit read access to the website repository
 * (or a public repository). Exits nonzero when unavailable or out of sync.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const owner='gildaspro5613-code', repo='melodie-digital-site';
const ref='feat/md-email-signatures-v1-20261023';
const path='email/signatures/identities.i18n.json';
const target=new URL('../src/lib/native/mail/signatures-source.json',import.meta.url);
const local=JSON.parse(readFileSync(target,'utf8'));
const sync=process.argv.includes('--sync-local');
if(process.argv.some(a=>a.startsWith('--')&&a!=='--sync-local')){console.error('SIGNATURE_OPTION_INVALID');process.exit(2);}
if(sync&&process.env.SIGNATURE_SOURCE_SYNC_APPROVED!=='yes'){console.error('SIGNATURE_SYNC_APPROVAL_REQUIRED: explicitly approve local change before review in Draft PR');process.exit(3);}
const valid=x=>x?.schema==='melodie.email-signatures.v1'&&Array.isArray(x.locales)&&['fr','en','es','de','it'].every(l=>x.locales.includes(l))&&['clara','gildas','support','contact','info'].every(id=>x.identities?.[id]?.address===id+'@melodie.digital'&&x.locations?.[x.identities[id].location]?.lines?.length>0)&&typeof x.logoUrl==='string'&&x.logoUrl.startsWith('https://melodie.digital/');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const headers={'Accept':'application/vnd.github.raw+json','User-Agent':'clara-os-signatures-sync-check'};
if(process.env.GITHUB_TOKEN)headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`;
let response;
try {response=await fetch(url,{headers,signal:AbortSignal.timeout(10000),redirect:'error'});}
catch(e){console.error('SIGNATURE_SOURCE_UNAVAILABLE:',e.message);process.exit(2);}
if(!response.ok){console.error('SIGNATURE_SOURCE_UNAVAILABLE: HTTP',response.status);process.exit(2);}
let remote;
try {remote=JSON.parse(await response.text());}
catch {console.error('SIGNATURE_SOURCE_INVALID');process.exit(2);}
if(!valid(remote)){console.error('SIGNATURE_SOURCE_INVALID_SCHEMA: refused update');process.exit(2);}
if(digest(local)!==digest(remote)){
 if(!sync){console.error('SIGNATURE_SOURCE_DRIFT: canonical source differs; explicitly approve --sync-local then review the diff in a Draft PR. No automatic activation.');process.exit(1);}
 writeFileSync(target,JSON.stringify(remote,null,2)+'\n',{flag:'w'});
 console.log('SIGNATURE_SOURCE_STAGED_LOCAL: review git diff; tests and PR approval required. No merge or deployment.');
 process.exit(0);
}
console.log('SIGNATURE_SOURCE_SYNC_PASS: both registries match.');
