import subprocess,time,hashlib,json,uuid
C='clara-canonical-test-postgres';D='canonical_lock_'+uuid.uuid4().hex
base=['docker','exec',C,'psql','-U','postgres','-d',D,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']
subprocess.run(['docker','exec',C,'createdb','-U','postgres',D],check=True)
from pathlib import Path
for p in sorted((Path(__file__).resolve().parents[3] / 'db/migrations').glob('*.sql')):
 if p.name[:3] in ('001','002','008','009'):
  subprocess.run(['docker','exec','-i',C,'psql','-U','postgres','-d',D,'-q','-v','ON_ERROR_STOP=1'],input=p.read_bytes(),check=True,capture_output=True)
digest=hashlib.sha256(b'lock-fixture').hexdigest()
seed=f"""INSERT INTO clara_auth_users(id) VALUES('u');INSERT INTO clara_auth_workspaces(id) VALUES('w');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','u','u');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('u','w','owner');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('{digest}','u',NOW()+INTERVAL '1 hour');INSERT INTO clara_registry_clients(workspace_id,id,display_name,created_by) VALUES('w','c','c','u');INSERT INTO clara_registry_projects(workspace_id,id,client_id,display_name,created_by) VALUES('w','p','c','p','u');INSERT INTO clara_registry_client_access VALUES('w','c','u',true,true,true,NULL);INSERT INTO clara_registry_project_access VALUES('w','p','u',true,true,true,NULL);INSERT INTO clara_registry_identity_links VALUES('w','u','lu','ip',NOW(),NULL);INSERT INTO clara_registry_project_links VALUES('w','p','c','lp','lu','u','pp',NOW(),NULL);"""
subprocess.run(base+['-c',seed],check=True,capture_output=True)
a=b=None
try:
 b=subprocess.Popen(['docker','exec','-i',C,*base[3:]],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
 b.stdin.write("BEGIN; SELECT id FROM clara_auth_workspaces WHERE id='w' FOR UPDATE; SELECT 'LOCKED';\n");b.stdin.flush()
 while b.stdout.readline().strip()!='LOCKED':pass
 a=subprocess.Popen(base+['-c',f"SELECT clara_registry_command('{digest}','w','list','{{}}'::jsonb)"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 for _ in range(100):
  out=subprocess.check_output(base+['-c',"SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT clara_registry_command%'"],text=True).strip()
  if out=='1':break
  time.sleep(.02)
 else:raise RuntimeError('Registry command did not wait on held workspace')
 b.stdin.write(f"SELECT clara_registry_ticket('{digest}','w','c','p','read','{'1'*64}'); COMMIT;\n");b.stdin.flush();b.stdin.close()
 out_a,err_a=a.communicate(timeout=10)
 b.wait(timeout=10);err_b=b.stderr.read()
 deadlock='40P01' in err_a+err_b
 result={'deadlock':deadlock,'registryExit':a.returncode,'ticketExit':b.returncode,'database':'isolated temporary PostgreSQL'}
 print(json.dumps(result))
 assert not deadlock, 'Canonical registry and ticket lock ordering caused PostgreSQL 40P01'
 assert a.returncode == b.returncode == 0, 'Both concurrent operations must complete'
finally:
 for p in (a,b):
  if p and p.poll() is None:p.kill();p.wait()
 subprocess.run(['docker','exec',C,'dropdb','-U','postgres',D],check=True,capture_output=True)
