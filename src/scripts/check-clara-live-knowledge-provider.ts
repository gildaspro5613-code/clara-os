import { strict as assert } from "node:assert";

import { ClaraLiveHttpKnowledgeSource } from "../lib/knowledge/clara-live/http-source";
import type { ClaraLiveKnowledgeReference } from "../lib/knowledge/clara-live/source";

async function runMockContractCheck(): Promise<void> {
  const requests: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = input instanceof URL ? input : new URL(String(input));
    requests.push(url);

    assert.equal(init?.method, "GET");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer bridge-secret");

    const payload: ClaraLiveKnowledgeReference[] = [
      {
        id: "clara-live:sound:l-acoustics:k2",
        domain: "sound",
        type: "loudspeaker",
        manufacturer: "L-Acoustics",
        model: "K2",
        verified: false,
        aliases: [],
        metadata: { notes: "Technical data pending verification" },
      },
    ];

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const source = new ClaraLiveHttpKnowledgeSource({
    baseUrl: "https://clara-live.example/",
    token: "bridge-secret",
    fetcher,
  });

  const results = await source.search({ domain: "sound", search: " L-Acoustics ", limit: 10 });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.model, "K2");
  assert.equal(results[0]?.domain, "sound");
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.pathname, "/api/knowledge/materials");
  assert.equal(requests[0]?.searchParams.get("domain"), "sound");
  assert.equal(requests[0]?.searchParams.get("search"), "L-Acoustics");
  assert.equal(requests[0]?.searchParams.get("limit"), "10");
}

async function runLiveContractCheck(): Promise<void> {
  const baseUrl = process.env.CLARA_LIVE_KNOWLEDGE_BASE_URL?.trim();
  if (!baseUrl) return;

  const source = new ClaraLiveHttpKnowledgeSource({
    baseUrl,
    token: process.env.CLARA_LIVE_KNOWLEDGE_TOKEN?.trim() || undefined,
  });

  const sound = await source.search({ domain: "sound", search: "L-Acoustics", limit: 20 });
  assert(sound.some((item) => item.model === "K2"), "Expected L-Acoustics K2 from Clara Live");

  const video = await source.search({ domain: "video", search: "Barco", limit: 20 });
  assert(video.length > 0, "Expected at least one Barco video reference from Clara Live");

  const production = await source.search({ domain: "production", limit: 5 });
  assert.deepEqual(production, [], "Production must remain reserved and empty in Knowledge V1");

  for (const item of [...sound, ...video]) {
    if (!item.verified) {
      assert(!("modes" in item.metadata), "Unverified reference exposed modes");
      assert(!("specs" in item.metadata), "Unverified reference exposed specs");
    }
  }
}

async function main(): Promise<void> {
  await runMockContractCheck();
  await runLiveContractCheck();
  console.log("Clara Live Knowledge provider contract: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
