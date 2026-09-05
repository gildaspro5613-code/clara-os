# Clara OS — Brain ↔ GPT Architecture V1

## Architectural invariant

**GPT is a cognitive provider of Clara's Brain. GPT is not Clara's Brain.**

Clara OS owns operational context, memory, Knowledge, missions, priorities, governance, capabilities and execution state. A model provider may analyse that context and return structured understanding, but it does not own Clara's orchestration authority.

## V1 request flow

```text
User / UI
   ↓
Clara Runtime
   ↓
Brain
   ├─ Context
   ├─ Memory
   ├─ Knowledge
   ├─ Sources
   └─ Available capabilities (context)
   ↓
GPT cognitive provider
   ↓
Structured Understanding
   ↓
Brain
   ├─ Prioritise
   ├─ Plan
   └─ Recommend
   ↓
Mission / Governance
   ↓
Capability boundary
   ↓
Connector / Execution
```

## Rules

1. One user request enters one Clara/Brain cycle.
2. UI/API routes must not create a second independent GPT orchestration cycle.
3. GPT may receive the list of Clara capabilities as context for reasoning.
4. The Brain reasoning provider must not expose executable tools to GPT.
5. Capability execution remains behind Clara policy, audit and approval boundaries.
6. WRITE and EXECUTE operations remain approval-controlled.
7. Clara must remain operational with deterministic fallback understanding if the model provider is unavailable.
8. Model providers are replaceable implementation details; Clara's Brain contracts must remain provider-agnostic.

## V1 validation

The first end-to-end validation must use an internal Clara operation that requires no external OAuth provider. Google/Gmail OAuth is explicitly outside this architecture validation and remains a separate integration concern.

## Non-goals

This change does not remove the existing capability bridge or governance layer. It establishes the ownership boundary first. A later increment may add a Brain-owned execution phase that selects proposed capabilities, applies governance, executes approved operations and feeds results back into the Brain without giving orchestration ownership to the model provider.
