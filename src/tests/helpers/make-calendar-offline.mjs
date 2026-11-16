// Run the targeted suite with --import this file before --import tsx. Injected
// fixture transports remain usable; accidental real provider/database I/O fails.
import {syncBuiltinESMExports} from 'node:module';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
const deny=()=>{throw new Error('OFFLINE_TEST_NETWORK_DENIED');};
globalThis.fetch=deny;
net.connect=deny;
net.createConnection=deny;
tls.connect=deny;
http.request=deny;
https.request=deny;
syncBuiltinESMExports();
