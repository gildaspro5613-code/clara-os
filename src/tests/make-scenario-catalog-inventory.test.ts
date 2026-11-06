import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

interface Scenario {
  key:string; makeScenarioId:number; effect:"READ"|"WRITE"|"SEND";
  service:string; executionAuthorization:string;
}
const inventory=JSON.parse(readFileSync("docs/operations/make-scenario-catalog-review-20261106.json","utf8")) as {
  status:string; classification:string; scenarios:Scenario[];
};
const recipe=readFileSync("docs/operations/native-make-scenario-catalog-clone-recipe.sql","utf8");
const admin=readFileSync("docs/operations/native-make-admin-command-clone-candidate.sql","utf8");

test("all nine current Make scenario keys have explicit effect and no runtime grant",()=>{
  assert.equal(inventory.status,"review-only");
  assert.equal(inventory.classification,"explicit-review-required");
  assert.equal(inventory.scenarios.length,9);
  assert.equal(new Set(inventory.scenarios.map(s=>s.key)).size,9);
  assert.equal(new Set(inventory.scenarios.map(s=>s.makeScenarioId)).size,9);
  for(const entry of inventory.scenarios){
    assert.match(entry.key,/^[a-z][a-z0-9-]+$/);
    assert.ok(Number.isSafeInteger(entry.makeScenarioId)&&entry.makeScenarioId>0);
    assert.ok(["READ","WRITE","SEND"].includes(entry.effect));
    assert.equal(entry.executionAuthorization,"NOT_GRANTED");
    assert.match(recipe,new RegExp("'"+entry.key+"'"));
  }
  assert.equal(inventory.scenarios.filter(s=>s.effect==="READ").length,3);
  assert.equal(inventory.scenarios.filter(s=>s.effect==="WRITE").length,5);
  assert.equal(inventory.scenarios.filter(s=>s.effect==="SEND").length,1);
});
test("reviewed catalog is disabled by default and cannot grant without native approval",()=>{
  assert.match(recipe,/enabled BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(recipe,/reviewed_by IS NOT NULL/);
  assert.match(recipe,/reviewed_at IS NOT NULL/);
  assert.match(recipe,/REVOKE ALL ON TABLE/);
  assert.match(admin,/clara_native_make_scenario_catalog/);
  assert.match(admin,/catalog\.effect='READ'/);
  assert.match(admin,/catalog\.enabled=TRUE/);
  assert.match(admin,/catalog\.reviewed_at IS NOT NULL/);
  assert.match(admin,/catalog\.revoked_at IS NULL/);
});
