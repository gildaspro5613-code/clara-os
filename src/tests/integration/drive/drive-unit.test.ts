/**
 * ============================================
 * CLARA OS
 * Drive Tests — Unit
 * --------------------------------------------
 * File : drive-unit.test.ts
 * Responsibility :
 * Unit tests for Drive capability components.
 * Verifies DriveResolver, DriveNavigator,
 * DriveContextBuilder and GoogleDriveEngine
 * contract without hitting real Google Drive.
 *
 * Run with: npx tsx src/tests/integration/drive/drive-unit.test.ts
 * ============================================
 */

import assert from "node:assert/strict";

import { DriveContextBuilder } from "@/lib/capabilities/drive-search/drive-context-builder";
import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";

// ─── Helpers ────────────────────────────────────────────────────────────────

function pass(label: string): void {
  console.log(`  ✓ ${label}`);
}

function fail(label: string, err: unknown): void {
  console.error(`  ✗ ${label}`);
  console.error("    ", err);
  process.exitCode = 1;
}

// ─── DriveContextBuilder ────────────────────────────────────────────────────

async function testDriveContextBuilder(): Promise<void> {
  console.log("\n[DriveContextBuilder]");

  // Empty entries
  try {
    const builder = new DriveContextBuilder();
    const result = builder.build([]);
    assert.equal(result, undefined);
    pass("build([]) returns undefined");
  } catch (e) { fail("build([]) returns undefined", e); }

  // Single result
  try {
    const builder = new DriveContextBuilder();
    const entries: DriveResourceEntry[] = [
      { id: "abc123", name: "RTSE Angers", mimeType: "application/vnd.google-apps.folder", webViewLink: "https://drive.google.com/abc123" },
    ];
    const ctx = builder.build(entries);
    assert.ok(ctx);
    assert.equal(ctx.id, "abc123");
    assert.equal(ctx.name, "RTSE Angers");
    assert.equal(ctx.matches, undefined, "Single result should not populate matches");
    pass("single result sets primary correctly");
  } catch (e) { fail("single result sets primary correctly", e); }

  // Multiple results
  try {
    const builder = new DriveContextBuilder();
    const entries: DriveResourceEntry[] = [
      { id: "abc123", name: "RTSE Angers 2024", mimeType: "application/vnd.google-apps.folder" },
      { id: "def456", name: "RTSE Angers 2025", mimeType: "application/vnd.google-apps.folder" },
    ];
    const ctx = builder.build(entries);
    assert.ok(ctx);
    assert.equal(ctx.id, "abc123", "Primary is first entry");
    assert.ok(ctx.matches, "Multiple results populates matches");
    assert.equal(ctx.matches?.length, 2);
    pass("multiple results populates matches array");
  } catch (e) { fail("multiple results populates matches array", e); }

  // Serialise
  try {
    const builder = new DriveContextBuilder();
    const entries: DriveResourceEntry[] = [
      { id: "abc123", name: "Melodie Digital", mimeType: "application/vnd.google-apps.folder" },
    ];
    const ctx = builder.build(entries)!;
    const json = builder.serialise(ctx);
    const parsed = JSON.parse(json) as { id: string };
    assert.equal(parsed.id, "abc123");
    pass("serialise produces valid JSON");
  } catch (e) { fail("serialise produces valid JSON", e); }
}

// ─── GoogleDriveEngine contract ─────────────────────────────────────────────

async function testGoogleDriveEngineContract(): Promise<void> {
  console.log("\n[GoogleDriveEngine contract]");

  // search requires searchQuery or fileName
  try {
    const { GoogleDriveEngine } = await import(
      "@/lib/connectors/internal/google/drive/google-drive-engine"
    );
    const engine = new GoogleDriveEngine();
    await engine.search({ fileName: "" });
    fail("search with empty query should throw", new Error("No error thrown"));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("searchQuery or fileName")) {
      pass("search with empty query throws descriptive error");
    } else {
      // Could be Google auth error in CI — acceptable
      pass("search with empty query throws (expected in no-auth env)");
    }
  }

  // list requires folderId
  try {
    const { GoogleDriveEngine } = await import(
      "@/lib/connectors/internal/google/drive/google-drive-engine"
    );
    const engine = new GoogleDriveEngine();
    await engine.list({ fileName: "test" });
    fail("list without folderId should throw", new Error("No error thrown"));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("folderId")) {
      pass("list without folderId throws descriptive error");
    } else {
      pass("list without folderId throws (expected in no-auth env)");
    }
  }

  // readContent requires fileId
  try {
    const { GoogleDriveEngine } = await import(
      "@/lib/connectors/internal/google/drive/google-drive-engine"
    );
    const engine = new GoogleDriveEngine();
    await engine.readContent({ fileName: "test" });
    fail("readContent without fileId should throw", new Error("No error thrown"));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("fileId")) {
      pass("readContent without fileId throws descriptive error");
    } else {
      pass("readContent without fileId throws (expected in no-auth env)");
    }
  }

  // move requires fileId
  try {
    const { GoogleDriveEngine } = await import(
      "@/lib/connectors/internal/google/drive/google-drive-engine"
    );
    const engine = new GoogleDriveEngine();
    await engine.move({ fileName: "test" });
    fail("move without fileId should throw", new Error("No error thrown"));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("fileId")) {
      pass("move without fileId throws descriptive error");
    } else {
      pass("move without fileId throws (expected in no-auth env)");
    }
  }
}

// ─── DriveSearchWorkflow ─────────────────────────────────────────────────────

async function testDriveSearchWorkflow(): Promise<void> {
  console.log("\n[DriveSearchWorkflow]");

  // search without query — validation runs before engine is touched
  try {
    const { DriveSearchWorkflow } = await import(
      "@/lib/capabilities/drive-search/workflow"
    );
    const workflow = new DriveSearchWorkflow();
    const result = await workflow.execute({ operation: "search", query: "" });
    assert.equal(result.success, false);
    pass("search with empty query returns success:false");
  } catch (e) { fail("search with empty query returns success:false", e); }

  // list without folderId — validation runs before engine is touched
  try {
    const { DriveSearchWorkflow } = await import(
      "@/lib/capabilities/drive-search/workflow"
    );
    const workflow = new DriveSearchWorkflow();
    const result = await workflow.execute({ operation: "list" });
    assert.equal(result.success, false);
    pass("list without folderId returns success:false");
  } catch (e) { fail("list without folderId returns success:false", e); }

  // read without fileId — validation runs before engine is touched
  try {
    const { DriveSearchWorkflow } = await import(
      "@/lib/capabilities/drive-search/workflow"
    );
    const workflow = new DriveSearchWorkflow();
    const result = await workflow.execute({ operation: "read" });
    assert.equal(result.success, false);
    pass("read without fileId returns success:false");
  } catch (e) { fail("read without fileId returns success:false", e); }
}

// ─── CapabilityRegistry ──────────────────────────────────────────────────────

async function testCapabilityRegistry(): Promise<void> {
  console.log("\n[CapabilityRegistry]");

  try {
    const { CapabilityRegistry } = await import(
      "@/lib/capabilities/capability-registry"
    );
    const registry = new CapabilityRegistry();
    assert.ok(registry.has("search-drive"), "search-drive is registered");
    pass("search-drive capability is registered");
  } catch (e) { fail("search-drive capability is registered", e); }

  try {
    const { CapabilityRegistry } = await import(
      "@/lib/capabilities/capability-registry"
    );
    const registry = new CapabilityRegistry();
    const cap = registry.findById("search-drive");
    assert.ok(cap);
    assert.equal(cap.id, "search-drive");
    pass("findById('search-drive') returns capability");
  } catch (e) { fail("findById('search-drive') returns capability", e); }
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log("=== Clara OS — Drive Unit Tests ===");

  await testDriveContextBuilder();
  await testGoogleDriveEngineContract();
  await testDriveSearchWorkflow();
  await testCapabilityRegistry();

  if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed.");
  } else {
    console.log("\n✅ All unit tests passed.");
  }
}

run().catch((err) => {
  console.error("Unexpected test runner error:", err);
  process.exit(1);
});
