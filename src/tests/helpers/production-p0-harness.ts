import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import vm from "node:vm";
import ts from "typescript";
export function moduleFrom(path:string,overrides:Record<string,unknown>) {
 const require=createRequire(resolve(path)),exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {exports,require:(key:string)=>overrides[key]??require(key),console,process,crypto:globalThis.crypto,Date});
 return exports;
}
