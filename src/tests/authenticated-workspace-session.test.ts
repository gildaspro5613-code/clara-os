import assert from "node:assert/strict";
import test from "node:test";
import { sessionTokenDigest } from "../lib/auth/authenticated-workspace-session";

test("session digest rejects untrusted and malformed tokens", () => {
  assert.equal(sessionTokenDigest("default"), null);
  assert.equal(sessionTokenDigest("user@example.com"), null);
  assert.equal(sessionTokenDigest(""), null);
});

test("session digest is deterministic and never stores raw bearer token", () => {
  const token = "A".repeat(43);
  const digest = sessionTokenDigest(token);
  assert.match(digest!, /^[0-9a-f]{64}$/);
  assert.equal(digest, sessionTokenDigest(token));
  assert.notEqual(digest, token);
});
