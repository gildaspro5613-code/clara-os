# Make Capability Layer V2

## Architecture boundary

Clara OS owns reasoning, mission state, authorization, autonomy, product entitlements and the capability registry. Make is an external execution provider used only after Clara OS has selected and authorized a capability.

Canonical path:

`Clara → Policy / Autonomy Gate → Runtime → Capability → provider adapter → external service → provider-neutral result`

Make must never become a second orchestrator or a source of truth for Clara OS.

## Native connector vs Make capability

Use a native Clara connector when the integration is strategic, stable, security-sensitive, latency-sensitive, or simple enough that an additional workflow layer adds no value.

Use Make when the operation is client-specific, spans several external systems, is a secondary integration, benefits from rapid composition, or does not justify a dedicated native connector.

The Brain should prefer semantic Clara capabilities such as `notify-team`. It should not need to know that Make executes the implementation. The generic `make.scenario.prepare` and `make.scenario.execute` capabilities remain infrastructure primitives and governance boundaries.

## Workspace authorization

Make scenarios are selected by stable `scenarioKey`; webhook URLs and secret headers remain in CredentialStore.

Workspace connection scopes may explicitly allow scenarios with:

`make:scenario:<scenarioKey>`

When at least one Make scenario scope exists, only listed scenario keys may execute. During V2 migration, workspaces without Make scenario scopes keep the credential-backed scenario map as the compatibility boundary.

## Synchronous and asynchronous execution

The synchronous webhook transport is intentionally bounded below Make's external execution window. It recognizes `completed`, `accepted`, and `pending` outcomes and preserves an optional `executionId` in the provider-neutral operational result.

Long-running workflows must return promptly with `accepted` or `pending` plus an execution identifier. A later callback/event path may reconcile the final result with Clara Runtime; the Runtime must not keep a request open indefinitely.

## POC: notify-team

`notify-team` is the first semantic Make-backed capability. It uses the fixed internal scenario key `notify-team`, validates its payload before provider execution, and remaps the provider result to the semantic Clara capability id. This proves that Clara can expose a business capability while keeping Make invisible to the cognitive layer.

The POC deliberately does not send a real notification until the workspace has an authorized and credential-backed `notify-team` scenario.

## MCP / Toolbox compatibility

MCP or Make Toolboxes may be added as another transport behind the same capability boundary. They must not change the semantic capability contract, bypass workspace authorization, expose provider credentials to the Brain, or bypass the Autonomy Gate.

Webhook V1 remains supported while an MCP transport is evaluated. Provider transport selection belongs below the Capability/Runtime boundary.
