"""Isolated integration transport. Production routers/auth/storage are unchanged."""
import os, sys, json, socket
from datetime import datetime, timezone
assert os.environ['MONGO_URL']=='mongodb://127.0.0.1:27039'
assert os.environ['DB_NAME'].startswith('canonical_audit_')
from pathlib import Path
live_repo=Path(os.environ['CANONICAL_LIVE_REPO']).resolve()
assert (live_repo/'backend/server.py').is_file()
sys.path.insert(0,str(live_repo/'backend'))
import httpx, uvicorn
from fastapi import FastAPI
from canonical_bridge import canonical_os_request
from canonical_archive_authority import CanonicalArchiveAuthority
from canonical_authority_routes import create_canonical_authority_router
from live_archive_routes import create_live_archive_router
import server

class LocalOS(httpx.AsyncBaseTransport):
    async def handle_async_request(self, request):
        assert request.url.host=='os.fixture.example'
        url=request.url.copy_with(scheme='http',host='127.0.0.1',port=int(os.environ['OS_PORT']))
        async with httpx.AsyncHTTPTransport() as transport:
            response=await transport.handle_async_request(httpx.Request(request.method,url,headers=request.headers,content=await request.aread()))
            return httpx.Response(response.status_code,headers=response.headers,content=await response.aread(),request=request)

async def os_request(payload):
    return await canonical_os_request(payload,transport=LocalOS())

app=FastAPI()
app.include_router(create_canonical_authority_router(db=server.db,current_user=server.current_user,
    allowed_origins=['https://live.fixture.example'],os_request=os_request),prefix='/api')
app.include_router(create_live_archive_router(authority=CanonicalArchiveAuthority(server.db,os_request)),prefix='/api')

@app.on_event('startup')
async def seed():
    await server.db.users.insert_many([{'user_id':u,'email':u+'@fixture.example','name':u,'created_at':datetime.now(timezone.utc).isoformat()} for u in ('alice','bob')])
    await server.db.projects.insert_many([{'id':p,'user_id':u,'name':p,'client':'free text never used','technical':{'geometry':[1,2,3],'fixtures':['untouched']}} for p,u in [('lp1','alice'),('lp2','alice'),('lp3','bob')]])
    print(json.dumps({'port':listener.getsockname()[1],'alice':server.make_jwt('alice'),'bob':server.make_jwt('bob')}),flush=True)

@app.get('/fixture/snapshot')
async def snapshot():
    return {'projects':await server.db.projects.find({},{'_id':0}).sort('id',1).to_list(20),
            'proofs':await server.db.canonical_link_proofs.count_documents({}),
            'lifecycle':await server.db.canonical_business_lifecycle.find({},{'_id':0}).to_list(20)}

@app.on_event('shutdown')
async def cleanup():
    await server.mongo.drop_database(os.environ['DB_NAME'])
    server.mongo.close()

listener=socket.socket();listener.bind(('127.0.0.1',0));listener.listen()
uvicorn.Server(uvicorn.Config(app,log_level='error',lifespan='on')).run(sockets=[listener])
