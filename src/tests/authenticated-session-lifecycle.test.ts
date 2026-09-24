import assert from "node:assert/strict";
import test from "node:test";
import { createOpaqueSessionToken, authenticatedSessionCookie, expiredSessionCookie } from "../lib/auth/authenticated-session-lifecycle";
import { sessionTokenDigest } from "../lib/auth/authenticated-workspace-session";

test("issued tokens are unique, opaque and hashable", () => {
  const a = createOpaqueSessionToken();
  const b = createOpaqueSessionToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.match(sessionTokenDigest(a)!, /^[0-9a-f]{64}$/);
});

test("session cookies are httpOnly, scoped and secure in production", () => {
  const cookie = authenticatedSessionCookie(createOpaqueSessionToken(), true);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.path, "/");
  assert.equal(cookie.options.maxAge, 43200);
  const expired = expiredSessionCookie(true);
  assert.equal(expired.options.maxAge, 0);
  assert.equal(expired.value, "");
});

test("rejects malformed session cookie tokens", () => {
  assert.throws(() => authenticatedSessionCookie("default", true), /INVALID_SESSION_TOKEN/);
});
