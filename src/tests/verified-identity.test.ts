import assert from "node:assert/strict";
import test from "node:test";
import { validateVerifiedIdentity } from "../lib/auth/verified-identity";

test("verified identity boundary rejects empty and oversized claims", () => {
  assert.throws(() => validateVerifiedIdentity({ issuer: "", subject: "user" }));
  assert.throws(() => validateVerifiedIdentity({ issuer: "issuer", subject: " " }));
  assert.throws(() => validateVerifiedIdentity({ issuer: "a".repeat(2049), subject: "user" }));
  assert.doesNotThrow(() => validateVerifiedIdentity({ issuer: "https://login.example", subject: "opaque-subject" }));
});
