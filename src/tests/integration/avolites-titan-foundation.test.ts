import assert from "node:assert/strict";
import test from "node:test";
import {
  AVOLITES_TITAN_WEBAPI_DEFAULT_PORT,
  buildTitanFixtureHandleLookupPath,
  buildTitanSoftwareVersionPath,
  TitanLightingFoundation,
  type TitanHttpRequest,
} from "@/lib/connectors/internal/avolites/titan";

test("Titan foundation uses documented WebAPI port and paths", () => {
  assert.equal(AVOLITES_TITAN_WEBAPI_DEFAULT_PORT, 4430);
  assert.equal(buildTitanSoftwareVersionPath(), "/titan/get/System/SoftwareVersion");
  assert.equal(buildTitanFixtureHandleLookupPath(), "/titan/handles/Fixtures");
});

test("Titan foundation performs only injected offline requests", async () => {
  const requests: TitanHttpRequest[] = [];
  const foundation = new TitanLightingFoundation({
    async send(request) { requests.push(request); },
  });
  await foundation.verifyApi();
  await foundation.discoverFixtureHandles();
  assert.deepEqual(requests, [
    { method: "GET", path: "/titan/get/System/SoftwareVersion" },
    { method: "GET", path: "/titan/handles/Fixtures" },
  ]);
});
