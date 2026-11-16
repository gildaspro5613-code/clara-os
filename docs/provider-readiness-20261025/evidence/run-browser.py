from pathlib import Path
import subprocess,os,json,time,uuid,ssl,urllib.request,shutil,socket
os.umask(0o077)
root=Path('/workspace/clara-os-v1-reception');proof=Path('/workspace/os-v1-provider-evidence-20261025')
container='clara-canonical-test-postgres'
for port in [3908,3910]:
 with socket.socket() as s:
  s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind(('127.0.0.1',port))
original={}
failures=[]
for name in ['key','cert']:
 p=Path('/tmp/native-runtime-'+name+'.pem')
 original[name]=p.read_bytes() if p.exists() else None
try:
 subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','/tmp/native-runtime-key.pem','-out','/tmp/native-runtime-cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-days','1'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for suite in os.environ.get('V1_BROWSER_SUITES','documents').split(','):
  db='native_browser_'+uuid.uuid4().hex;folder=proof/('browser-'+suite);folder.mkdir(exist_ok=True)
  env=os.environ.copy();env.update(NATIVE_TEST_DATABASE=db,DATABASE_URL='postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic',OPENAI_API_KEY='synthetic-test-only',CLARA_AUTH_APP_ORIGIN='https://127.0.0.1:3910',GOOGLE_CLIENT_ID='synthetic-google-client',GOOGLE_CLIENT_SECRET='synthetic-google-secret',GOOGLE_REDIRECT_URI='https://127.0.0.1:3910/api/connections/google/callback',CLARA_CREDENTIALS_ENCRYPTION_KEY='CQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQk=',NATIVE_HTTP_PORT='3908',NATIVE_TLS_PORT='3910',DOCUMENTS_E2E_ORIGIN='https://127.0.0.1:3910',NODE_EXTRA_CA_CERTS='/tmp/native-runtime-cert.pem',DOCUMENT_CONTINUITY_EVIDENCE=str(folder),CLARA_IONOS_NETWORK_ENABLED='false',CLARA_IONOS_MONITOR_ENABLED='false',V1_FIRST_DAY='true',NATIVE_PROXY_DIAGNOSTICS='1',DOCUMENTS_E2E_CHROMIUM='/usr/bin/chromium')
  env.pop('POSTGRES_URL',None)
  with (folder/'fixture.log').open('w') as log:subprocess.run(['node','--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
  app=None;proxy=None;logs=[]
  def start():
   f=(folder/('app-'+uuid.uuid4().hex[:6]+'.log')).open('w');logs.append(f)
   appenv=env.copy();appenv['NODE_OPTIONS']='--import='+str(root/'src/tests/helpers/native-runtime-browser-preload.mjs')
   process=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3908'],cwd=root,env=appenv,stdout=f,stderr=subprocess.STDOUT)
   return process
  def stop(process):
   if process and process.poll() is None:
    process.terminate()
    try:process.wait(timeout=15)
    except subprocess.TimeoutExpired:process.kill();process.wait()
  def ready():
   ca=ssl.create_default_context(cafile='/tmp/native-runtime-cert.pem')
   for _ in range(40):
    try:
     with urllib.request.urlopen('https://127.0.0.1:3910/clara',context=ca,timeout=5) as r:
      if r.status==200:return
    except Exception:time.sleep(.5)
   raise RuntimeError('Isolated application did not become ready')
  try:
   app=start();f=(folder/'proxy.log').open('w');logs.append(f)
   proxy=subprocess.Popen(['node','src/tests/helpers/native-runtime-tls-proxy.mjs'],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT);ready()
   files=['src/tests/native-google-work-browser.e2e.mjs','src/tests/native-google-work-restart-browser.e2e.mjs'] if suite=='google' else ['src/tests/native-document-continuity-browser.e2e.mjs','src/tests/native-document-continuity-restart-browser.e2e.mjs','src/tests/provider-surface-browser.e2e.mjs']
   for i,file in enumerate(files):
    if i:stop(app);app=start();ready()
    with (folder/('browser.log' if i==0 else 'restart.log' if i==1 else 'surface.log')).open('w') as log:
     subprocess.run(['node','--import','tsx','--test',file],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=700,check=True)
   (folder/'executed.json').write_text(json.dumps({'suite':suite,'status':'PASS','database':'disposable PostgreSQL','serverRestarted':True,'providers':'simulated only','browser':'Chromium actual','externalBusinessCalls':0},indent=2)+'\n')
   print(suite+' browser + actual server restart: PASS',flush=True)
  except Exception as error:
   failures.append(suite);print(suite+' browser: FAIL ('+type(error).__name__+'); preserved log, continuing independent suite',flush=True)
  finally:
   stop(app);stop(proxy)
   for f in logs:f.close()
   subprocess.run(['docker','exec',container,'dropdb','--if-exists','-U','postgres',db],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
finally:
 for name,value in original.items():
  p=Path('/tmp/native-runtime-'+name+'.pem')
  if value is None:p.unlink(missing_ok=True)
  else:p.write_bytes(value)

if failures:raise SystemExit(1)
