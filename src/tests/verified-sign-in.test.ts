import assert from "node:assert/strict";
import test from "node:test";
import { completeVerifiedSignIn } from "../lib/auth/verified-sign-in";

test("verified sign-in rejects invalid identity before any database lookup", async () => {
  await assert.rejects(
    completeVerifiedSignIn({ issuer: "", subject: "untrusted" }),
    /INVALID_VERIFIED_IDENTITY/,
  );
  await assert.rejects(
    completeVerifiedSignIn({ issuer: "https://issuer.example", subject: "" }),
    /INVALID_VERIFIED_IDENTITY/,
  );
});
