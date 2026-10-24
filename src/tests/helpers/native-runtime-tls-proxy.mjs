import https from 'node:https';
import {forwardNativeRequest} from './native-runtime-http-forward.mjs';
import {readFileSync} from 'node:fs';
if(!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??''))throw Error('Isolated fixture only');
const port=Number(process.env.NATIVE_TLS_PORT??3060),target=Number(process.env.NATIVE_HTTP_PORT??3058);
if(port<3000||port>3999||target<3000||target>3999)throw Error('Isolated ports only');
https.createServer({key:readFileSync('/tmp/native-runtime-key.pem'),cert:readFileSync('/tmp/native-runtime-cert.pem')},(req,res)=>{
 forwardNativeRequest(req,res,target);
}).listen(port,'127.0.0.1');
