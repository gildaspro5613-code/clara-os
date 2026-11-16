import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

test('MagicQ real handlers/SQL: preserve, explicit replace/clear, atomic CAS, scope, revocation, integrity and invoker role',{skip:!process.env.MAGICQ_TEST_CONTAINER},async()=>{
 const container=process.env.MAGICQ_TEST_CONTAINER!;
 assert.ok(['clara-magicq-config-test-postgres','clara-canonical-test-postgres'].includes(container));
 const child=spawn(process.execPath,['--import','tsx','src/tests/helpers/magicq-configuration-http.mts'],{env:process.env,stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',d=>errors+=d);let db='';
 try {
  const lines=createInterface({input:child.stdout});const line=await Promise.race([once(lines,'line').then(v=>String(v[0])),once(child,'exit').then(()=>{throw Error(errors);}),new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Bootstrap timeout')),30000).unref())]);
  const ready=JSON.parse(line);db=ready.database;const origin='http://127.0.0.1:'+ready.port;
  const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8'}).trim();
  const path='/api/external/lighting/onboarding/configuration';
  const request=async(body:object,status=200,token='synthetic-connector-product')=>{
   const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json','x-clara-product':'clara-live','Authorization':'Bearer '+token},body:JSON.stringify(body)});const v=await r.json();assert.equal(r.status,status,JSON.stringify(v));return v;
  };
  const saved=(await request({provider:'chamsys.magicq',host:'127.0.0.1',port:6553,expectedRevision:0,fixtureChannels:{'fixture-A':17,'fixture-B':18},confirmMapping:true})).configuration;
  assert.equal(saved.revision,1);assert.deepEqual(saved.fixtureChannels,{'fixture-A':17,'fixture-B':18});
  const read={provider:'chamsys.magicq',operation:'READ',connectionId:saved.connectionId};
  assert.deepEqual((await request(read)).configuration,saved);
  const edit={provider:'chamsys.magicq',connectionId:saved.connectionId,host:'127.0.0.2',port:7000,expectedRevision:1};
  const net=(await request(edit)).configuration;assert.equal(net.revision,2);assert.deepEqual(net.fixtureChannels,saved.fixtureChannels);
  await request({...edit,expectedRevision:undefined},428);
  await request({...edit,expectedRevision:2,fixtureChannels:null,confirmMapping:true},400);
  await request({...edit,expectedRevision:2,fixtureChannels:{},confirmMapping:true},422);
  await request({...edit,expectedRevision:2,fixtureChannels:{x:2}},422);
  await request({...edit,expectedRevision:2,fixtureChannels:{x:0},confirmMapping:true},422);
  await request({...edit,expectedRevision:2,clearMapping:true,fixtureChannels:{x:2},confirmMapping:true},422);
  assert.deepEqual((await request(read)).configuration,net);
  const simultaneous=await Promise.all(['127.0.0.3','127.0.0.4'].map(host=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json','x-clara-product':'clara-live','Authorization':'Bearer synthetic-connector-product'},body:JSON.stringify({...edit,host,expectedRevision:2})})));
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
  const head=(await request(read)).configuration;assert.equal(head.revision,3);assert.deepEqual(head.fixtureChannels,saved.fixtureChannels);
  await request(read,401,'invalid');
  await request({...read,workspaceId:'foreign'},400);
  await request({...read,connectionId:'foreign-connection'},404);
  pg(`UPDATE clara_connections SET workspace_id='foreign' WHERE id='${saved.connectionId}'`);await request(read,404);
  pg(`UPDATE clara_connections SET workspace_id='isolated-connector-workspace',status='DISABLED' WHERE id='${saved.connectionId}'`);await request(read,409);await request({...edit,expectedRevision:3},409);
  pg(`UPDATE clara_connections SET status='ACTIVE' WHERE id='${saved.connectionId}'`);
  pg(`UPDATE clara_magicq_connection_configuration SET fixture_channels='{"unexpected":10}' WHERE connection_id='${saved.connectionId}'`);await request(read,409);await request({...edit,expectedRevision:3},409);
  pg(`UPDATE clara_magicq_connection_configuration SET fixture_channels='${JSON.stringify(saved.fixtureChannels)}' WHERE connection_id='${saved.connectionId}'`);
  const replacement=(await request({...edit,expectedRevision:3,fixtureChannels:{'fixture-A':20},confirmMapping:true})).configuration;assert.equal(replacement.revision,4);assert.deepEqual(replacement.fixtureChannels,{'fixture-A':20});
  const cleared=(await request({...edit,expectedRevision:4,clearMapping:true,confirmMapping:true})).configuration;assert.equal(cleared.revision,5);assert.deepEqual(cleared.fixtureChannels,{});
  // The SQL entry point does not require schema CREATE, superuser or bypass-RLS.
  const role='magicq_limited_'+db.replace('connector_http_','');
  pg(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT,INSERT,UPDATE ON clara_connections,clara_magicq_connection_configuration TO ${role};GRANT EXECUTE ON FUNCTION clara_magicq_configuration(text,text,jsonb),clara_magicq_config_hash(text,integer,jsonb,bigint) TO ${role}`);
  try{assert.equal(pg(`SELECT has_schema_privilege('${role}','public','CREATE')`),'f');assert.ok(JSON.parse(pg(`SET ROLE ${role};SELECT clara_magicq_configuration('isolated-connector-workspace','READ','{}')`)).configuration);}
  finally{pg(`DROP OWNED BY ${role};DROP ROLE ${role}`);}
 }finally{
  if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}
  if(db)execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);
 }
});

test('additive migration preserves existing configuration, is repeatable, and detects revision alteration',{skip:!process.env.MAGICQ_TEST_CONTAINER},()=>{
 const container=process.env.MAGICQ_TEST_CONTAINER!;assert.ok(['clara-magicq-config-test-postgres','clara-canonical-test-postgres'].includes(container));
 const db='magicq_legacy_'+randomUUID().replaceAll('-','');execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 try{
  pg(`CREATE TABLE clara_connections(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,provider TEXT NOT NULL,status TEXT NOT NULL,scopes JSONB NOT NULL DEFAULT '[]',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(workspace_id,provider));CREATE TABLE clara_magicq_connection_configuration(connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id),host TEXT NOT NULL,port INTEGER NOT NULL,fixture_channels JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());INSERT INTO clara_connections(id,workspace_id,provider,status) VALUES('legacy','legacy-workspace','chamsys.magicq','ACTIVE');INSERT INTO clara_magicq_connection_configuration(connection_id,host,port,fixture_channels) VALUES('legacy','127.0.0.1',7000,'{"existing-fixture":17}');`);
  const before=pg('SELECT row_to_json(t) FROM clara_magicq_connection_configuration t');
  for(let i=0;i<2;i++)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/029_magicq_configuration_revision.sql'),stdio:['pipe','pipe','pipe']});
  const after=JSON.parse(pg('SELECT row_to_json(t) FROM clara_magicq_connection_configuration t'));delete after.revision;delete after.content_sha256;assert.deepEqual(after,JSON.parse(before));
  const update=JSON.parse(pg(`SELECT clara_magicq_configuration('legacy-workspace','SAVE','{"host":"127.0.0.2","expectedRevision":1}')`));assert.deepEqual(update.configuration.fixtureChannels,{'existing-fixture':17});assert.equal(update.configuration.port,7000);
  pg('UPDATE clara_magicq_connection_configuration SET revision=999');assert.equal(JSON.parse(pg(`SELECT clara_magicq_configuration('legacy-workspace','READ','{}')`)).error,'MAGICQ_CONFIGURATION_INTEGRITY');
 }finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);}
});
