import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

function key(productId: string, workspaceId: string, userId: string, sessionId: string) {
  return "external:" + createHash("sha256")
    .update([productId, workspaceId, userId, sessionId].join("\u001f"))
    .digest("hex");
}

describe("Unified Core context isolation", () => {
  it("changes the durable key for every isolation dimension", () => {
    const base = key("clara-live", "workspace-a", "user-a", "session-a");
    expect(key("clara-live", "workspace-a", "user-b", "session-a")).not.toBe(base);
    expect(key("clara-live", "workspace-b", "user-a", "session-a")).not.toBe(base);
    expect(key("clara-live", "workspace-a", "user-a", "session-b")).not.toBe(base);
  });

  it("does not collapse external sessions into the legacy default key", () => {
    expect(key("clara-live", "workspace-a", "user-a", "session-a")).not.toBe("default");
  });
});
