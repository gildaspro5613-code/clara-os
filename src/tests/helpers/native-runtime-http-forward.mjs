import http from 'node:http';

/** Test transport only: one upstream request, one fresh loopback socket, no retry. */
export function forwardNativeRequest(req,res,target){
 if(!Number.isInteger(target)||target<1||target>65535)throw Error('Isolated upstream port required');
 const forwarded=http.request({host:'127.0.0.1',port:target,path:req.url,method:req.method,
  agent:false,headers:{...req.headers,connection:'close'}},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.on('error',()=>res.destroy());incoming.pipe(res);});
 forwarded.on('error',error=>{
  console.error('ISOLATED_PROXY_UPSTREAM_ERROR',error.code??'UNKNOWN');
  if(res.headersSent){res.destroy();return;}
  res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'ISOLATED_PROXY_UPSTREAM_UNAVAILABLE'}));
 });
 req.pipe(forwarded);
}
