# Clara OS — Brain ↔ GPT Architecture V1

## Architectural invariant

**GPT is a cognitive provider of Clara's Brain. GPT is not Clara's Brain.**

Clara OS owns operational context, memory, Knowledge, missions, priorities, governance, capabilities and execution state. A model provider may analyse that context and return structured understanding, but it does not own Clara's orchestration authority.

## V1 request flow

```text
User / UI
   ↓
Persisted Clara Conversation + User Identity
   ↓
Clara Runtime (durable session rehydrated)
   ↓
Brain
   ├─ Context
   ├─ Conversation history
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
   ├──────────────→ Response Composer → Persisted Conversation → User / UI
   ↓
Capability boundary
   ↓
Connector / Execution
```

## Conversation and session continuity

Clara OS must expose one durable Clara conversation, not one conversation per page or per React component.

Cockpit and `/clara` are two views over the same persisted conversation. Navigating away, returning to the Cockpit or reloading a page must not erase the discussion.

The persisted Clara session is also the source of truth for the active mission. A serverless runtime must rehydrate that durable session before every cognitive event; continuity must never depend on a warm module singleton.

The Brain receives recent conversation history as context so short follow-ups such as “et maintenant ?”, “la suite” or “ce projet” remain attached to the correct active mission.

A follow-up message continues the active mission by default unless the user clearly changes subject or explicitly requests a new mission. When the Brain advances the plan, the existing mission id is preserved and the mission task state is reconciled rather than creating a duplicate mission.

## User identity

User identity is first-class Clara session context.

The same identity is available to the Hero, the chat surfaces and the Response Composer. Clara may therefore greet and address the user naturally while remaining workspace/user configurable rather than binding product behavior to a hard-coded name.

The current V1 retains a transitional single-owner fallback for the Melodie Digital workspace until authenticated workspace identity becomes the source of truth.

## Response Composer

Clara needs a conversational voice without creating a second Brain.

The Response Composer is therefore a presentation-only cognitive layer. It receives the already-decided Brain/session state and turns it into Clara's natural conversational response.

It may use a language model, but:

- it receives no executable tools;
- it cannot select or authorize capabilities;
- it cannot modify mission state;
- it cannot override Brain decisions;
- it cannot claim an external action has happened when it has not;
- it must preserve Clara's natural, warm, professional and non-robotic voice;
- it receives enough bounded output budget to finish a professional response without truncating the last sentence.

This distinction allows Clara to remain human in conversation while keeping a single orchestration authority.

## Cockpit synchronization

Cockpit indicators are projections of the same Clara session, not independent demo data.

At minimum the V1 Cockpit derives from live session state:

- active mission and next action;
- mission progress and completed task count;
- persisted conversation activity;
- current priority focus;
- latest Clara conversational synthesis.

As the conversation changes the mission, Cockpit, Clara and Missions must converge on the same persisted operational state.

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
11. Cockpit and `/clara` must render the same persisted conversation.
12. The runtime must rehydrate durable state before each serverless event.
13. Follow-up conversation should update the active mission instead of creating duplicate missions unless the subject genuinely changes.
14. User identity must come from Clara session/workspace identity and be available consistently to Clara's conversational surfaces.

## V1 validation

The first end-to-end validation must use an internal Clara operation that requires no external OAuth provider. Google/Gmail OAuth is explicitly outside this architecture validation and remains a separate integration concern.

Validation must cover the layers independently:

- **Brain quality:** useful domain-specific analysis, coherent mission continuity, no external execution unless governed by Clara;
- **Conversational quality:** natural Clara voice, no raw Brain-field recital, no second orchestration authority, no truncated response;
- **Navigation continuity:** Cockpit → Clara → Missions → Cockpit preserves the same transcript and active mission;
- **State synchronization:** a follow-up that advances the mission updates Mission, Cockpit and Clara views after refresh/navigation;
- **Identity:** the Hero and Clara use the configured user first name naturally.

## Non-goals

This change does not remove the existing capability bridge or governance layer. It establishes the ownership boundary first. A later increment may add a Brain-owned execution phase that selects proposed capabilities, applies governance, executes approved operations and feeds results back into the Brain without giving orchestration ownership to the model provider.
