/**
 * ============================================
 * CLARA OS
 * Core Workspace Store
 * --------------------------------------------
 * Persists Clara's workspace configuration.
 * Development storage adapter.
 * ============================================
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";

import {
  dirname,
  join,
} from "path";

import type { ClaraWorkspace } from "./workspace";

const WORKSPACE_FILE =
  join(
    process.env.VERCEL
      ? "/tmp"
      : process.cwd(),
    ".clara",
    "workspace.json",
  );

function ensureDirectory(): void {

  mkdirSync(
    dirname(WORKSPACE_FILE),
    {
      recursive: true,
    },
  );

}

export function saveWorkspace(
  workspace: ClaraWorkspace,
): void {

  ensureDirectory();

  writeFileSync(
    WORKSPACE_FILE,
    JSON.stringify(
      workspace,
      null,
      2,
    ),
    "utf8",
  );

}

export function loadWorkspace():
  ClaraWorkspace | null {

  try {

    const raw =
      readFileSync(
        WORKSPACE_FILE,
        "utf8",
      );

    return JSON.parse(
      raw,
    ) as ClaraWorkspace;

  } catch {

    return null;

  }

}
