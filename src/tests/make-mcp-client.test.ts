import assert from "node:assert/strict";
import test from "node:test";

import { MakeMcpClient, MakeMcpError } from "@/lib/connectors/make/mcp-client";

test("MakeMcpClient calls a mapped Toolbox tool", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      result: { status: "completed", fileId: "file-1" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const client = new MakeMcpClient(fetcher);
  const result = await client.execute({
    url: "https://eu1.make.com/mcp/toolbox/test",
    bearerToken: "test-token",
    tools: { "create-drive-folder": "create_drive_folder" },
  }, {
    scenarioKey: "create-drive-folder",
    payload: { workspaceId: "workspace-1", folderName: "Mission A" },
  });

  assert.equal(result.ok, true);
  assert.equal(result.scenarioKey, "create-drive-folder");
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url, "https://eu1.make.com/mcp/toolbox/test");
  const headers = new Headers(request.init?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  const body = JSON.parse(String(request.init?.body));
  assert.equal(body.method, "tools/call");
  assert.equal(body.params.name, "create_drive_folder");
  assert.deepEqual(body.params.arguments, { workspaceId: "workspace-1", folderName: "Mission A" });
});

test("MakeMcpClient rejects non-HTTPS endpoints", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    return new Response();
  };

  const client = new MakeMcpClient(fetcher);
  await assert.rejects(
    () => client.execute({ url: "http://example.com", bearerToken: "token" }, {
      scenarioKey: "notify-team",
      payload: {},
    }),
    (error: unknown) => error instanceof MakeMcpError && error.code === "INVALID_URL",
  );
  assert.equal(called, false);
});
