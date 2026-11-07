import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const panel=readFileSync(join(process.cwd(),'src/components/native/NativeMailPanel.tsx'),'utf8');

test('draft submission is disabled until every local edit is saved',()=>{
 assert.match(panel,/const draftDirty=/);
 assert.match(panel,/JSON\.stringify\(\{subject:draft\.subject,body:draft\.body,recipients:draft\.recipients,attachmentIds:draft\.attachmentIds\}\)/);
 assert.match(panel,/disabled=\{busy\|\|draftDirty\}[^>]*onClick=\{\(\)=>void perform\(async\(\)=>\{await post\('submit'\)/);
 assert.match(panel,/setSavedDraft\(saved\)/);
});

test('approval token is retained after refresh rather than cleared by refresh',()=>{
 assert.match(panel,/await refresh\(\);setApproval\(\{id:review\.id,token:b\.token\}\)/);
 assert.match(panel,/disabled=\{busy\|\|!owned\|\|approval\?\.id!==review\.id\}/);
});

test('changing mailbox or refreshing invalidates locally cached draft baseline',()=>{
 assert.match(panel,/setDraft\(null\);setSavedDraft\(null\)/);
 assert.match(panel,/if\(d\.status==='fulfilled'\)\{setDraft\(d\.value\.draft\);setSavedDraft\(d\.value\.draft\);\}/);
});
