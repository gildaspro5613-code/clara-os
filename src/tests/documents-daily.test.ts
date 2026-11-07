import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

test('daily Documents surface includes only native, user-confirmed write operations',()=>{
 const page=read('src/app/documents/page.tsx');
 const ui=read('src/components/documents/NativeDocumentDailyPanel.tsx');
 assert.match(page,/<NativeDocumentDailyPanel/);
 assert.match(ui,/data-document-daily/);
 for(const code of ['drive.upload','drive.create','drive.update'])assert.ok(ui.includes(code));
 assert.match(ui,/nativePost\('prepare',\{input\}\)/);
 assert.match(ui,/nativePost\('execute',\{operationId:review.operationId,reviewHash:review.reviewHash,confirm:true\}\)/);
 assert.match(ui,/disabled=\{busy\|\|!confirm\|\|!writable\}/);
 assert.match(ui,/window.confirm\(t\('workspaceConfirmFolder'/);
 assert.match(ui,/MAX_UPLOAD=2\*1024\*1024/);
 assert.doesNotMatch(ui,/\/api\/documents.*method:'POST'/);
 assert.match(ui,/nativePost\('select',\{kind:'folder',resourceId:folder.id\}\)/);
 assert.match(ui,/nativePost\('bind',\{kind:'folder',resourceId:folder.id,version:inspect.resource.version\}\)/);
});
test('Clara drafts are native-session scoped and cannot publish without confirmation',()=>{
 const route=read('src/app/api/native/documents/draft/route.ts');
 assert.match(route,/withNativeScope\(request,true/);
 assert.match(route,/session.nativeMissionId!==context.session.mission.id/);
 assert.match(route,/OpenAIResponsesEngine\(\)\.generate/);
 assert.match(route,/savedToDrive:false/);
 assert.match(route,/requiresApprovalBeforeWrite:true/);
 assert.doesNotMatch(route,/GoogleDocsEngine|\.documents\.create|executeGoogleWork|\/api\/native\/google\/work/);
 assert.match(route,/DOCUMENT_DRAFT_PROVIDER_UNAVAILABLE/);
 assert.match(route,/48\*1024/);
 assert.match(route,/content.length>100_000/);
});
test('export is bounded to native project/revision and Google Docs only',()=>{
 const service=read('src/lib/native/documents.ts');
 const route=read('src/app/api/documents/route.ts');
 assert.match(service,/async exportGoogleDoc\(fileId:string,format:'pdf'\|'docx'\|'txt'\)/);
 assert.match(service,/const b=await this.binding\(fileId\),metadata=await this.rights\(fileId,b.version\)/);
 assert.match(service,/metadata.mimeType!=='application\/vnd.google-apps.document'/);
 assert.match(service,/readDocumentStream\(result.data as Readable,10\*1024\*1024\)/);
 assert.match(service,/await this.rights\(fileId,b.version\)/);
 assert.match(service,/nativeGoogleCommand\('document'/);
 assert.match(route,/withNativeScope\(request,false/);
 assert.match(route,/action==='export'/);
 assert.match(route,/return documents.exportGoogleDoc/);
 assert.match(pageOrThrow(),/data-document-export-formats/);
 function pageOrThrow(){return read('src/app/documents/page.tsx');}
});
test('folder candidates are filtered by current Google/SQL authority and not auto-bound',()=>{
 const work=read('src/lib/native/google-work.ts');
 const route=read('src/app/api/native/google/work/route.ts');
 assert.match(work,/async folders\(pageToken\?:string\)/);
 assert.match(work,/this.owner\(\);const scopes=await this.scopes\('drive'\)/);
 assert.match(work,/googleWorkCommand\('candidate',\{connectionId:this.connectionId,kind:'folder',id:file.id\}\)/);
 assert.match(work,/if\(candidate.allowed\)folders.push/);
 assert.doesNotMatch(work.slice(work.indexOf('async folders('),work.indexOf('async calendars(')),/this.bind\(|this.select\(/);
 assert.match(route,/if\(action==='folders'\)return ok\(await work.folders/);
});
test('all five supported locales expose every daily Documents label',()=>{
 const fr=JSON.parse(read('src/i18n/messages/fr/documents-daily.json')) as Record<string,string>;
 assert.equal(Object.keys(fr).length,44);
 for(const lang of ['en','es','de','it']){
  const other=JSON.parse(read('src/i18n/messages/'+lang+'/documents-daily.json')) as Record<string,string>;
  assert.deepEqual(Object.keys(other).sort(),Object.keys(fr).sort(),lang);
  for(const [key,value] of Object.entries(other))assert.ok(value.trim().length>2,key+' '+lang);
 }
 const request=read('src/i18n/request.ts');
 assert.match(request,/documents-daily.json/);
 assert.match(request,/documents: \{\.\.\.\(baseMessages.documents as Record<string, unknown>\), \.\.\.dailyDocumentsModule.default\}/);
});
