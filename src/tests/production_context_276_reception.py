"""Opt-in actual OS/Live HTTP + PostgreSQL/Mongo/compiled browser reception.

Only the provider, Core runtime dispatch and product credentials are test
adapters. Projection, Brain reasoning, composer, validators, job worker and SQL
stores are actual OS modules. Live uses its actual client/handlers/JWT/writers.
No deployed environment, paid provider, external network or hardware.
"""
import hashlib,json,os,re,select,subprocess,sys,time
from contextlib import contextmanager
from copy import deepcopy
from pathlib import Path
from uuid import uuid4
import httpx,pytest

LIVE=os.getenv('CLARA_LIVE_RECEPTION_ROOT')
if not LIVE or os.getenv('ISSUE_276_RECEPTION')!='1':
 pytest.skip('Explicit isolated Live checkout and ISSUE_276_RECEPTION=1 required',allow_module_level=True)
LIVE=Path(LIVE).resolve();ROOT=Path(__file__).resolve().parents[2]
# Set harmless startup placeholders before Live's module-level clients load.
# The recipe replaces these clients with its actual disposable database.
os.environ.update(MONGO_URL='mongodb://127.0.0.1:1/?directConnection=true',DB_NAME='issue_276_isolated',JWT_SECRET='issue-276-local-test-only',OPENAI_API_KEY='')
sys.path[:0]=[str(LIVE/'backend'),str(LIVE/'backend/tests')]
from test_roadbook_branding_browser import local_mongo
from test_lot2_light_documents_browser import recipe,auth,request,preparation
from p0_interop_fixture import isolated_server
from lot2_light_fixture import direct_transport
from clara_os_client import ClaraOSClient,ClaraOSSettings
from playwright.sync_api import sync_playwright,expect
import server
PROOF=ROOT/'docs/reception/issue-276/proofs'
HEADERS={'x-clara-product':'clara-live','authorization':'Bearer test-credential'}
CONTAINER=os.getenv('DOCUMENT_OPERATION_TEST_CONTAINER','')
assert re.fullmatch(r'clara-document-registry-test(?:-[a-z0-9]+)?',CONTAINER),'Isolated PostgreSQL container required'

def sql(statement):
 return subprocess.check_output(['docker','exec',CONTAINER,'psql','-U','postgres','-qAt','-v','ON_ERROR_STOP=1','-c',statement],text=True).strip()

@contextmanager
def os_server(label):
 PROOF.mkdir(parents=True,exist_ok=True)
 log=(PROOF/(label+'-os-http.log')).open('w')
 process=subprocess.Popen(['node','--import','tsx','src/tests/helpers/event-job-test-server.ts'],cwd=ROOT,env={**os.environ,'TSX_DISABLE_CACHE':'1'},stdout=subprocess.PIPE,stderr=log,text=True,bufsize=1)
 try:
  ready=select.select([process.stdout],[],[],30)[0];assert ready,'OS fixture startup timed out'
  line=process.stdout.readline();log.write(line);log.flush();origin=json.loads(line)['test_origin']
  # The remaining route traces go directly to the proof log, avoiding pipe fill.
  import threading
  def drain():
   for line in process.stdout:log.write(line);log.flush()
  reader=threading.Thread(target=drain,daemon=True);reader.start()
  yield origin
 finally:
  process.terminate();process.wait(15)
  if 'reader' in locals():reader.join(5)
  log.close()

def wait_job(client,id,scope):
 for _ in range(150):
  r=client.post('/api/external/event-jobs/status',json={'jobId':id,'scope':scope});assert r.status_code==200,r.text
  job=r.json()['data']
  if job['status'] in ('completed','failed','uncertain','expired'):return job
  time.sleep(.1)
 pytest.fail('Isolated durable OS job did not finish')

def test_http_dimensions_growth_failures_idempotence_and_restart():
 command="const {incident276}=require('./src/tests/helpers/production-276-fixture');console.log(JSON.stringify([1,2,4,8,16].map(scale=>({scale,event:incident276(scale)}))))"
 fixtures=json.loads(subprocess.check_output(['node','--import','tsx','-e',command],cwd=ROOT,text=True))
 proof={'provider':'SIMULATED, no SDK transport','storage':'PostgreSQL 17.11, network none, tmpfs','cases':[]}
 with os_server('matrix') as origin,httpx.Client(base_url=origin,headers=HEADERS,timeout=30) as api:
  for fixture in fixtures:
   event=fixture['event'];event['scope']['sessionId']='isolated-276-'+uuid4().hex;id=uuid4().hex+uuid4().hex
   prior_calls=len(api.get('/test/metrics').json()['simulatedProvider']['calls'])
   submitted=api.post('/api/external/event-jobs',json={'jobId':id,'event':event});assert submitted.status_code==202,submitted.text
   job=wait_job(api,id,event['scope']);assert job['status']=='completed',job
   proposal=json.loads(job['result']['response']);assert proposal['project_id']=='A' and proposal['preparation_id']=='prep-A'
   assert '09:00' in proposal['rows'][0]['value'] and '11:00' in proposal['rows'][0]['value']
   assert any('DOSSIER PARTIEL' in row['label'] for row in proposal['rows'])
   stored=json.loads(sql("SELECT result FROM clara_external_event_jobs WHERE job_id='"+id+"'"));assert stored==job['result']
   metrics=api.get('/test/metrics').json();before=metrics['executions']
   generated=metrics['simulatedProvider']['calls'][prior_calls:];assert [call['profile'] for call in generated]==['reasoning','live_production']
   assert generated[1]['sourceChars']<=12000
   assert api.post('/api/external/event-jobs',json={'jobId':id,'event':event}).status_code==200
   assert api.get('/test/metrics').json()['executions']==before
   changed=deepcopy(event);changed['message']+=' CHANGED'
   assert api.post('/api/external/event-jobs',json={'jobId':id,'event':changed}).status_code==409
   foreign=deepcopy(event['scope']);foreign['workspaceId']='other-project'
   assert api.post('/api/external/event-jobs/status',json={'jobId':id,'scope':foreign}).status_code==404
   proof['cases'].append({'scale':fixture['scale'],'request_chars':len(json.dumps(event,ensure_ascii=False,separators=(',',':'))),'job_id':id,'status':job['status'],'rows':len(proposal['rows']),'one_composition':True,'replay_executions':0,'conflict_http':409,'foreign_scope_http':404})
  wrong=api.post('/api/external/event-jobs',headers={'x-clara-product':'other-product','authorization':'Bearer other-test-credential'},json={'jobId':uuid4().hex*2,'event':event});assert wrong.status_code==403
  mismatched=deepcopy(event);mismatched['context']['live']['preparationId']='wrong-preparation'
  before_invalid=api.get('/test/metrics').json()['executions']
  assert api.post('/api/external/events',json=mismatched).status_code==400
  assert api.get('/test/metrics').json()['executions']==before_invalid
  for mode in ('truncated','invalid','foreign'):
   api.post('/test/config',json={'mode':mode});negative=deepcopy(event);negative['scope']['sessionId']='negative-'+uuid4().hex;id=uuid4().hex*2
   assert api.post('/api/external/event-jobs',json={'jobId':id,'event':negative}).status_code==202
   job=wait_job(api,id,negative['scope']);assert job['status']=='failed' and job.get('result') is None,job
   row=json.loads(sql("SELECT row_to_json(j) FROM (SELECT status,result,failure_category FROM clara_external_event_jobs WHERE job_id='"+id+"') j"));assert row['result'] is None
   if mode=='truncated':assert row['failure_category']=='output_truncated'
   parts=[negative['scope'][key] for key in ('productId','workspaceId','userId','sessionId')]
   if negative['project']['id']!=negative['scope']['workspaceId']:parts.append(negative['project']['id'])
   key='external:'+hashlib.sha256('\x1f'.join(parts).encode()).hexdigest()
   conversation=json.loads(sql("SELECT data FROM clara_sessions WHERE id='"+key+"'"))['conversation']
   assert len(conversation)==2 and 'Arbitrer le chevauchement' not in conversation[1]['content']
   assert 'clara.production.proposal.v1' not in conversation[1]['content']
   proof['cases'].append({'provider_mode':mode,'status':job['status'],'sql':row})
  proof['metrics']=api.get('/test/metrics').json()
  assert all(call['sourceHasConflict'] for call in proof['metrics']['simulatedProvider']['calls'])
  completed=proof['cases'][0];saved_scope=fixtures[0]['event']['scope']
 with os_server('restart') as origin,httpx.Client(base_url=origin,headers=HEADERS,timeout=30) as api:
  reopened=wait_job(api,completed['job_id'],saved_scope);assert reopened['status']=='completed'
  assert api.get('/test/metrics').json()['executions']==0
  proof['os_http_restart_retains_receipt_without_replay']=True
 (PROOF/'http-postgres.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2))

def test_actual_live_context_browser_accept_explicit_save_and_failure(recipe,monkeypatch):
 uri,database,db,blobs,calls=recipe;monkeypatch.setenv('CLARA_COGNITION_MODE','core')
 proof={'Live_tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=LIVE,text=True).strip(),'provider':'SIMULATED','calls':calls}
 with os_server('live') as os_origin,isolated_server(uri,database,blobs,monkeypatch,calls) as origin,httpx.Client(base_url=origin,headers=auth(),verify=False,timeout=40) as api,httpx.Client(base_url=os_origin,headers=HEADERS,timeout=30) as os_api:
  monkeypatch.setattr(server,'ClaraOSClient',lambda:ClaraOSClient(settings=ClaraOSSettings(os_origin,'clara-live','test-credential')))
  project=request(api,'POST','/projects',json={'name':'Réception 276 — concert synthétique','environments':['production','sound','lighting','video','structure']}).json();pid=project['id'];prep=preparation(api,pid)
  for section,label,value in [('production','Montage','09:00–12:00 ; équipe plateau ; accès documenté'),('lighting','Réglages lumière','11:00–13:00 ; même équipe plateau ; dépend du montage'),('sound','Diffusion','L-Acoustics : modèle et implantation à déterminer'),('video','Surface','Résolution à confirmer'),('production','Structure','Trois ponts déclarés ; aucune certification')]:
   request(api,'POST','/preparations/'+prep['id']+'/items',json={'section':section,'label':label,'value':value,'status':'to_verify','source':'user'})
  docraw=b'Planning de recette seulement. Montage 09:00-12:00 et reglages 11:00-13:00, meme equipe plateau. Horaires a arbitrer, sans certification.'
  document=request(api,'POST','/documents',data={'project_id':pid},files={'file':('source-276.txt',docraw,'text/plain')}).json()
  base='/projects/'+pid+'/business-workspace/production';params={'preparation_id':prep['id']}
  snapshot=request(api,'GET',base,params=params).json()
  rows=[{'id':'load','section':'timeline','label':'Montage','date':'2026-11-20','time':'09:00','end_time':'12:00','team':'plateau','responsible':'Régie','status':'to_verify'},{'id':'focus','section':'tasks','label':'Réglages','date':'2026-11-20','time':'11:00','end_time':'13:00','team':'plateau','responsible':'Régie','depends_on':['load'],'status':'to_verify'}]
  body={'preparation_id':prep['id'],'expected_version':0,'expected_context_revision':snapshot['context']['revision'],'content':{'rows':rows,'notes':'Réception locale 276, données synthétiques et non certifiées'}}
  request(api,'PUT',base,json=body);before=deepcopy(db.preparations.find_one({'id':prep['id']}))
  request(api,'GET',base,params=params,headers=auth('v'),expected=404)
  request(api,'GET',base+'/check',params={**params,'version':1},headers=auth('essential'),expected=403)
  url='/projects/'+pid+'/workspace/production?preparation_id='+prep['id']
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   try:
    ctx=browser.new_context(ignore_https_errors=True,viewport={'width':1600,'height':1050});direct_transport(ctx,origin,language=None)
    ctx.add_init_script('localStorage.setItem("clara.token",'+json.dumps(auth()['Authorization'][7:])+');localStorage.setItem("clara.lang","fr")')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    def prepare():
     page.goto(origin+url);expect(page.get_by_test_id('production-focused-cockpit')).to_be_visible(timeout=30000)
     page.get_by_test_id('production-focused-prepare').click();expect(page.get_by_test_id('clara-panel')).to_be_visible()
    prepare();expect(page.get_by_test_id('clara-messages')).to_contain_text('Arbitrer le chevauchement du plateau',timeout=30000)
    page.get_by_test_id('clara-panel-close').click()
    page.get_by_test_id('production-focused-clara').get_by_role('button',name='Corriger et enregistrer',exact=True).click()
    preview=page.get_by_test_id('production-proposal-preview');expect(preview).to_contain_text('Arbitrer le chevauchement du plateau')
    assert db.preparations.find_one({'id':prep['id']})==before
    page.screenshot(path=str(PROOF/'live-proposals-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});preview.scroll_into_view_if_needed();page.screenshot(path=str(PROOF/'live-proposals-mobile.png'))
    preview.get_by_role('article').filter(has_text='Arbitrer le chevauchement du plateau').get_by_role('button',name='Accepter cette proposition',exact=True).click()
    expect(page.get_by_test_id('production-supervision')).to_contain_text('Arbitrer le chevauchement du plateau',timeout=15000)
    assert db.preparations.find_one({'id':prep['id']})==before
    with page.expect_response(lambda r:r.request.method=='PUT' and r.url.split('?')[0].endswith('/business-workspace/production') and r.status==200):page.get_by_role('button',name='Sauvegarder le brouillon',exact=True).click()
    saved=request(api,'GET',base,params=params).json();assert saved['worksheets']['production']['version']==2
    assert any(row['label']=='Arbitrer le chevauchement du plateau' and row['status']=='to_verify' for row in saved['worksheets']['production']['content']['rows'])
    request(api,'PUT',base,json=body,expected=409)
    page.reload();expect(page.get_by_test_id('production-supervision')).to_contain_text('Arbitrer le chevauchement du plateau',timeout=30000)
    page.screenshot(path=str(PROOF/'live-explicit-save-reopened.png'),full_page=True)
    # Valid JSON with provider incomplete status must produce a failed job,
    # no proposal cards, no automatic resubmission and no business write.
    os_api.post('/test/config',json={'mode':'truncated'});saved_before=deepcopy(db.preparations.find_one({'id':prep['id']}));executions=os_api.get('/test/metrics').json()['executions']
    prepare();expect(page.get_by_test_id('production-focused-clara')).to_contain_text('Clara',timeout=30000)
    for _ in range(150):
     failed=list(db.clara_jobs.find({'project_id':pid,'status':'failed','tool_name':'core_conversation'}))
     if failed:break
     page.wait_for_timeout(100)
    assert failed,'Live must observe actual OS failure'
    page.get_by_test_id('clara-panel-close').click();assert page.get_by_test_id('production-proposal-preview').count()==0
    expect(page.get_by_role('alert').filter(has_text='Clara n’a pas fourni de proposition complète exploitable').first).to_be_visible()
    assert db.preparations.find_one({'id':prep['id']})==saved_before
    page.wait_for_timeout(1000);assert os_api.get('/test/metrics').json()['executions']==executions+1
    page.screenshot(path=str(PROOF/'live-incomplete-refused.png'),full_page=True)
    # A completed response remains unapplicable if the saved version changes
    # between preview and human approval. The concurrent winner is untouched.
    os_api.post('/test/config',json={'mode':'completed'});prepare()
    page.get_by_test_id('clara-panel-close').click()
    page.get_by_test_id('production-focused-clara').get_by_role('button',name='Corriger et enregistrer',exact=True).click()
    preview=page.get_by_test_id('production-proposal-preview');expect(preview).to_contain_text('Arbitrer le chevauchement du plateau',timeout=30000)
    revoked_before=deepcopy(db.preparations.find_one({'id':prep['id']}))
    db.users.update_one({'user_id':'u'},{'$set':{'tier':'essential','subscription_tier':'essential'}})
    preview.get_by_role('article').filter(has_text='Arbitrer le chevauchement du plateau').get_by_role('button',name='Accepter cette proposition',exact=True).click()
    expect(page.get_by_role('alert').filter(has_text='Accès ou révision non confirmé').first).to_be_visible()
    assert db.preparations.find_one({'id':prep['id']})==revoked_before
    page.screenshot(path=str(PROOF/'live-revoked-access-refused.png'),full_page=True)
    db.users.update_one({'user_id':'u'},{'$set':{'tier':'premium','subscription_tier':'premium'}})
    concurrent=deepcopy(saved['worksheets']['production']['content']);concurrent['notes']+=' · Révision concurrente conservée'
    request(api,'PUT',base,json={'preparation_id':prep['id'],'expected_version':2,'expected_context_revision':saved['context']['revision'],'content':concurrent})
    winner=deepcopy(db.preparations.find_one({'id':prep['id']}))
    preview.get_by_role('article').filter(has_text='Arbitrer le chevauchement du plateau').get_by_role('button',name='Accepter cette proposition',exact=True).click()
    expect(page.get_by_role('alert').filter(has_text='La préparation a changé').first).to_be_visible()
    assert db.preparations.find_one({'id':prep['id']})==winner
    page.screenshot(path=str(PROOF/'live-stale-preview-refused.png'),full_page=True)
    ctx.close()
    fresh=browser.new_context(ignore_https_errors=True,viewport={'width':1600,'height':1050});direct_transport(fresh,origin,language=None)
    fresh.add_init_script('localStorage.setItem("clara.token",'+json.dumps(auth()['Authorization'][7:])+');localStorage.setItem("clara.lang","fr")')
    reopened=fresh.new_page();reopened.goto(origin+url)
    expect(reopened.get_by_test_id('production-focused-cockpit')).to_contain_text('Arbitrer le chevauchement du plateau',timeout=30000)
    current=request(api,'GET',base,params=params).json();assert current['worksheets']['production']['version']==3 and current['worksheets']['production']['content']==concurrent
    assert request(api,'GET','/documents/'+document['id']+'/download').content==docraw
    reopened.screenshot(path=str(PROOF/'live-fresh-session-reopened.png'),full_page=True)
    assert not errors,errors
    proof.update(explicit_save_version=2,concurrent_version=3,fresh_browser_reopened=True,concurrent_winner_preserved=True,revoked_access_refused=True,approval_draft_only=True,unsaved_before_approval=True,refusals=[403,404,409],incomplete_failure_visible=True,no_automatic_resubmit=True,project_id=pid,preparation_id=prep['id'],document_id=document['id'],saved_content_sha256=hashlib.sha256(json.dumps(saved['worksheets']['production']['content'],sort_keys=True).encode()).hexdigest(),metrics=os_api.get('/test/metrics').json())
   finally:browser.close()
  assert db.stage_models.count_documents({})==0 and db.lighting_design_runs.count_documents({})==0
  proof['business_writes']=[call for call in calls if call['method']=='PUT' and call['path'].endswith('/production')]
  assert [call['status'] for call in proof['business_writes']]==[200,200,409,200]
 (PROOF/'live-reception.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2))
