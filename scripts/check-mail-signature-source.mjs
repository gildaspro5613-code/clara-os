#!/usr/bin/env node
/**
 * Read-only cross-repository signature registry drift check.
 * GET only; never modifies GitHub, IONOS, or OS runtime.
 * Requires GITHUB_TOKEN with explicit read access to the website repository
 * (or a public repository). Exits nonzero when unavailable or out of sync.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const owner='gildaspro5613-code', repo='melodie-digital-site';
const ref='feat/md-email-signatures-v1-20261023';
const path='email/signatures/identities.i18n.json';
const local=JSON.parse(readFileSync(new URL('../src/lib/native/mail/signatures-source.json',import.meta.url),'utf8'));
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
if(digest(local)!==digest(remote)){console.error('SIGNATURE_SOURCE_DRIFT: canonical source differs; review and update OS registry through a Draft PR. No automatic activation.');process.exit(1);}
console.log('SIGNATURE_SOURCE_SYNC_PASS: both registries match.');
