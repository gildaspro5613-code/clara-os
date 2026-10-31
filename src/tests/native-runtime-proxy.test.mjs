import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {forwardNativeRequest} from './helpers/native-runtime-http-forward.mjs';
const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;};
const close=async server=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};
const request=(port,path='/',agent=false)=>new Promise((resolve,reject)=>{const r=http.get({host:'127.0.0.1',port,path,agent,headers:{origin:'https://os.fixture.example',authorization:'Bearer synthetic-test-only'}},response=>{let body='';response.on('data',chunk=>body+=chunk);response.on('aborted',()=>reject(Object.assign(new Error('Incomplete isolated response'),{code:'ECONNRESET'})));response.on('end',()=>resolve({status:response.statusCode,body}));});r.on('error',reject);});

test('isolated proxy: a pooled connection can reset, fresh forwarding preserves one request per socket',async()=>{
 const visits=new WeakMap(),ports=[],headers=[];let requests=0;
 const upstream=http.createServer((req,res)=>{requests++;const count=(visits.get(req.socket)??0)+1;visits.set(req.socket,count);if(count>1){req.socket.destroy();return;}ports.push(req.socket.remotePort);headers.push(req.headers);res.end('fixture');});
 const upstreamPort=await listen(upstream),pool=new http.Agent({keepAlive:true,maxSockets:1});let proxy;
 try{
  assert.equal((await request(upstreamPort,'/',pool)).status,200);
  await assert.rejects(()=>request(upstreamPort,'/',pool),error=>error.code==='ECONNRESET');
  pool.destroy();proxy=http.createServer((req,res)=>forwardNativeRequest(req,res,upstreamPort));const port=await listen(proxy),before=requests;
  assert.equal((await request(port)).status,200);assert.equal((await request(port)).status,200);
  assert.equal(requests-before,2);assert.notEqual(ports.at(-1),ports.at(-2));
  assert.equal(headers.at(-1).origin,'https://os.fixture.example');assert.equal(headers.at(-1).authorization,'Bearer synthetic-test-only');
 }finally{pool.destroy();if(proxy)await close(proxy);await close(upstream);}
});

test('isolated proxy: an upstream reset is explicit 503 and never causes a second handoff',async()=>{
 let requests=0;const upstream=http.createServer(req=>{requests++;req.socket.destroy();});const upstreamPort=await listen(upstream);
 const proxy=http.createServer((req,res)=>forwardNativeRequest(req,res,upstreamPort));const port=await listen(proxy);
 try{const result=await request(port);assert.equal(result.status,503);assert.deepEqual(JSON.parse(result.body),{code:'ISOLATED_PROXY_UPSTREAM_UNAVAILABLE'});assert.equal(requests,1);}
 finally{await close(proxy);await close(upstream);}
});

test('isolated proxy: losing a response after headers cannot become a false complete receipt or retry',async()=>{
 let requests=0;const upstream=http.createServer((req,res)=>{requests++;res.writeHead(200,{'Content-Type':'application/json','Content-Length':'200'});res.write('{"success":');setTimeout(()=>res.destroy(),10);});
 const upstreamPort=await listen(upstream),proxy=http.createServer((req,res)=>forwardNativeRequest(req,res,upstreamPort)),port=await listen(proxy);
 try{await assert.rejects(()=>request(port),error=>error.code==='ECONNRESET');assert.equal(requests,1);}
 finally{await close(proxy);await close(upstream);}
});
