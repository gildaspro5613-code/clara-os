import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('cached overview ranks quarantine and high-priority messages before truncating attention',()=>{
 const route=readFileSync('src/app/api/native/mail/route.ts','utf8');
 assert.match(route,/\.filter\(m=>m\.triage\.requiresAttention\)\.sort\(/);
 assert.match(route,/quarantine:0,high:1,normal:2,low:3/);
 assert.match(route,/\.slice\(0,10\)\.map\(/);
});
test('overview never claims a complete or fresh inbox without evidence',()=>{
 const route=readFileSync('src/app/api/native/mail/route.ts','utf8');
 assert.match(route,/freshnessVerified:false/);
 assert.match(route,/source:'previously-synchronized-first-page'/);
 assert.match(route,/partial:page\.nextCursor!==null/);
 assert.match(route,/status:'unavailable'/);
});
