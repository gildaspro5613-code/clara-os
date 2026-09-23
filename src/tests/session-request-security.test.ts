import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "../lib/auth/session-request-security";

test("state-changing auth requests require an explicit HTTPS same origin", () => {
  assert.equal(isSameOriginRequest("https://clara.example", "https://clara.example"), true);
  assert.equal(isSameOriginRequest("https://evil.example", "https://clara.example"), false);
  assert.equal(isSameOriginRequest("http://clara.example", "https://clara.example"), false);
  assert.equal(isSameOriginRequest("https://clara.example", undefined), false);
  assert.equal(isSameOriginRequest(null, "https://clara.example"), false);
  assert.equal(isSameOriginRequest("https://clara.example/path", "https://clara.example"), false);
});
