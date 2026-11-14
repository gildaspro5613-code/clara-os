import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureSameBuilderDatabase} from '@/lib/connectors/core/native-connector-builder-sql';

const base='postgresql://neondb_owner:fixture@ep-prod-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const builder='postgresql://clara_connector_read_login:fixture@ep-prod.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';
test('same Neon branch/database permits a distinct scoped runtime account',()=>{
 assert.doesNotThrow(()=>ensureSameBuilderDatabase(base,builder));
});
test('a missing role, owner reuse or cross-database/branch URL never fall back to owner credentials',()=>{
 for(const [a,b] of [
 [base,undefined],
 [undefined,builder],
 [base,base],
 [base,builder.replace('clara_connector_read_login','neondb_owner')],
 [base,builder.replace('/neondb','/wrongdb')],
 [base,builder.replace('ep-prod','ep-other')],
 [base,builder.replace('.neon.tech','.example.net')],
 [base,'not-a-url'],
 ] as Array<[string|undefined,string|undefined]>){
  assert.throws(()=>ensureSameBuilderDatabase(a,b),
    (e:unknown)=>e instanceof Error&&e.message.startsWith('CONNECTOR_BUILDER_DATABASE'));
 }
});
