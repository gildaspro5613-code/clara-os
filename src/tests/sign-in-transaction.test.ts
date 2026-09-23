import assert from "node:assert/strict";
import test from "node:test";
import { createSignInSecrets, isOpaqueAuthValue } from "../lib/auth/sign-in-transaction";

test("OIDC sign-in state and nonce are independent opaque random secrets", () => {
  const a = createSignInSecrets();
  const b = createSignInSecrets();
  assert.ok(isOpaqueAuthValue(a.state));
  assert.ok(isOpaqueAuthValue(a.nonce));
  assert.notEqual(a.state, a.nonce);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.nonce, b.nonce);
});

test("rejects malformed or caller-identifying transaction values", () => {
  for (const value of ["", "default", "user@example.com", "x".repeat(129)]) {
    assert.equal(isOpaqueAuthValue(value), false);
  }
});
