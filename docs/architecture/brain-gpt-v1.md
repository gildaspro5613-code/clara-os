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
   ├──────────────→ Response Composer → User / UI
   ↓
Capability boundary
   ↓
Connector / Execution
```

## Response Composer

Clara needs a conversational voice without creating a second Brain.

The Response Composer is therefore a presentation-only cognitive layer. It receives the already-decided Brain/session state and turns it into Clara's natural conversational response.

It may use a language model, but:

- it receives no executable tools;
- it cannot select or authorize capabilities;
- it cannot modify mission state;
- it cannot override Brain decisions;
- it cannot claim an external action has happened when it has not;
- it must preserve Clara's natural, warm, professional and non-robotic voice.

This distinction allows Clara to remain human in conversation while keeping a single orchestration authority.

## Rules

1. One user request enters one Clara/Brain decision cycle.
2. UI/API routes must not create a second independent GPT orchestration cycle.
3. GPT may receive the list of Clara capabilities as context for reasoning.
4. The Brain reasoning provider must not expose executable tools to GPT.
5. A Response Composer may run after the Brain only as a tool-free expression layer.
6. Capability execution remains behind Clara policy, audit and approval boundaries.
7. WRITE and EXECUTE operations remain approval-controlled.
8. Clara must remain operational with deterministic fallback understanding if the model provider is unavailable.
9. Model providers are replaceable implementation details; Clara's Brain contracts must remain provider-agnostic.
10. Brain reasoning should prefer domain-operational progress over generic clarification when the available context is sufficient to advance safely.

## V1 validation

The first end-to-end validation must use an internal Clara operation that requires no external OAuth provider. Google/Gmail OAuth is explicitly outside this architecture validation and remains a separate integration concern.

Validation must cover both layers independently:

- **Brain quality:** useful domain-specific analysis, coherent mission continuity, no external execution unless governed by Clara;
- **Conversational quality:** natural Clara voice, no raw Brain-field recital, no second orchestration authority.

## Non-goals

This change does not remove the existing capability bridge or governance layer. It establishes the ownership boundary first. A later increment may add a Brain-owned execution phase that selects proposed capabilities, applies governance, executes approved operations and feeds results back into the Brain without giving orchestration ownership to the model provider.
