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
 req.on('aborted',()=>forwarded.destroy());
 res.on('close',()=>{if(!res.writableFinished)forwarded.destroy();});
 req.pipe(forwarded);
}

/** Development fixture only: preserve Next's HMR WebSocket handshake. The
 * production-mode fixture needs only HTTP, but Next dev waits for this channel
 * before hydrating client controls. Never proxy an arbitrary upgrade target.
 */
export function forwardNativeDevelopmentUpgrade(req,socket,head,target){
 if(!Number.isInteger(target)||target<1||target>65535)throw Error('Isolated upstream port required');
 if(!['/_next/hmr','/_next/webpack-hmr'].includes(req.url.split('?')[0])||req.headers.upgrade?.toLowerCase()!=='websocket'){socket.destroy();return;}
 let peer;
 const forwarded=http.request({host:'127.0.0.1',port:target,path:req.url,method:'GET',agent:false,headers:{...req.headers,connection:'Upgrade'}});
 const stop=()=>{forwarded.destroy();peer?.destroy();socket.destroy();};
 forwarded.on('error',stop);forwarded.on('response',stop);socket.on('error',stop);socket.on('end',stop);socket.on('close',()=>{forwarded.destroy();peer?.destroy();});
 forwarded.on('upgrade',(response,upstream,upstreamHead)=>{
  peer=upstream;upstream.on('error',stop);upstream.on('end',stop);upstream.on('close',()=>socket.destroy());
  const lines=[];for(let i=0;i<response.rawHeaders.length;i+=2)lines.push(response.rawHeaders[i]+': '+response.rawHeaders[i+1]);
  socket.write('HTTP/1.1 101 Switching Protocols\r\n'+lines.join('\r\n')+'\r\n\r\n');
  if(upstreamHead.length)socket.write(upstreamHead);if(head.length)upstream.write(head);
  socket.pipe(upstream).pipe(socket);
 });
 forwarded.end();
}
