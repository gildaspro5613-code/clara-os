import type { ConnectorDefinition, ConnectorOperationType } from "../core/connector";

export const GITHUB_CAPABILITIES = {
  REPOSITORY_LIST: "github.repository.list",
  REPOSITORY_READ: "github.repository.read",
  BRANCH_LIST: "github.branch.list",
  FILE_READ: "github.file.read",
  COMMIT_LIST: "github.commit.list",
  ISSUE_LIST: "github.issue.list",
  ISSUE_READ: "github.issue.read",
  PULL_REQUEST_LIST: "github.pull_request.list",
  PULL_REQUEST_READ: "github.pull_request.read",
  CHECKS_READ: "github.checks.read",
  ISSUE_PREPARE: "github.issue.prepare",
  PULL_REQUEST_PREPARE: "github.pull_request.prepare",
  COMMENT_PREPARE: "github.comment.prepare",
  FILE_PREPARE: "github.file.prepare",
  ISSUE_CREATE: "github.issue.create",
  ISSUE_UPDATE: "github.issue.update",
  PULL_REQUEST_CREATE: "github.pull_request.create",
  COMMENT_CREATE: "github.comment.create",
  FILE_UPDATE: "github.file.update",
  BRANCH_CREATE: "github.branch.create",
  PULL_REQUEST_MERGE: "github.pull_request.merge",
} as const;

const operationTypes: Record<(typeof GITHUB_CAPABILITIES)[keyof typeof GITHUB_CAPABILITIES], ConnectorOperationType> = {
  "github.repository.list": "READ", "github.repository.read": "READ", "github.branch.list": "READ",
  "github.file.read": "READ", "github.commit.list": "READ", "github.issue.list": "READ",
  "github.issue.read": "READ", "github.pull_request.list": "READ", "github.pull_request.read": "READ",
  "github.checks.read": "READ", "github.issue.prepare": "PREPARE", "github.pull_request.prepare": "PREPARE",
  "github.comment.prepare": "PREPARE", "github.file.prepare": "PREPARE", "github.issue.create": "WRITE",
  "github.issue.update": "WRITE", "github.pull_request.create": "WRITE", "github.comment.create": "WRITE",
  "github.file.update": "WRITE", "github.branch.create": "WRITE", "github.pull_request.merge": "EXECUTE",
};

export const GitHubConnectorDefinition: ConnectorDefinition = {
  id: "github",
  name: "GitHub",
  version: "1.0.0",
  authentication: { type: "oauth2", credentialReference: "connectionId" },
  capabilities: Object.values(GITHUB_CAPABILITIES).map((id) => ({
    id,
    operationType: operationTypes[id],
    description: `${operationTypes[id]} GitHub operation: ${id}.`,
  })),
};
