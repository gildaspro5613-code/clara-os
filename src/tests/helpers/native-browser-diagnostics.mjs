import {spawnSync} from 'node:child_process';
// CI logs may be inaccessible through the repository proxy. Preserve the test
// exit status and expose a bounded, synthetic-fixture diagnostic annotation.
const [suite,...args]=process.argv.slice(2);
if(!['core','cockpit'].includes(suite)||!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??'')||!['localhost','127.0.0.1'].includes(new URL(process.env.DOCUMENTS_E2E_ORIGIN??'https://invalid.example').hostname))throw Error('Isolated native browser diagnostics only');
const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024});
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
const code=result.status??1;
if(code!==0){
 const output=(String(result.stdout??'')+'\n'+String(result.stderr??'')+'\n'+String(result.error?.message??''))
  .replace(/\u001b\[[0-9;]*m/g,'').replace(/https?:\/\/[^\s"'<>]+/g,'[URL omitted]')
  .split('\n').filter(line=>!/(authorization|cookie|access_token|refresh_token|encrypted_payload|password)/i.test(line)).join('\n').slice(-6000);
 const escape=s=>s.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
 process.stdout.write(`::error title=Isolated native UI ${suite}::${escape(output)}\n`);
}
process.exit(code);
