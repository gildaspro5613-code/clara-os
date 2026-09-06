# Clara Lighting — MagicQ / MQ50 controlled hardware test

Status: PREPARED — DO NOT ENABLE NETWORK UNTIL THE OPERATOR COMPLETES THIS CHECKLIST.

## Scope

First physical certification of `lighting.fixture.intensity.set` only.
No colour, position, beam, cue, playback, discovery or scan is part of this test.

## Preconditions

- MQ50 and Clara test host are on the same isolated/trusted test network.
- MagicQ Ethernet Remote Protocol is configured to receive CREP commands.
- Universal Connection is `ACTIVE` and uses connector `chamsys.magicq`.
- Persisted MagicQ destination is the operator-confirmed network destination (normally the installation broadcast address), not a hard-coded console IP.
- CREP port is 6553 unless the installation explicitly uses another validated port.
- One test fixture is patched and its technical DMX channel is known.
- Clara `fixtureId` → MagicQ technical DMX channel mapping has been checked by the operator.
- No production show is connected to this test path.
- Operator has immediate manual control of the console and can stop the test.

## Mandatory preflight

Before enabling network, run the hardware-test readiness guard with the operator-approved values:

- workspaceId
- connectionId
- fixtureId
- expected destination host
- expected CREP port
- expected technical DMX channel

The preflight must return `ready: true`. Any mismatch aborts the test.

## Test sequence

1. Confirm the fixture is at 0% manually.
2. Enable the server network gate only for the controlled test environment: `CLARA_MAGICQ_NETWORK_ENABLED=true`.
3. Execute one approved Clara capability command: intensity 50% for the single test fixture.
4. Observe the MQ50 and fixture. A successful UDP send is **not** proof of physical execution.
5. Execute intensity 0% for the same fixture.
6. Disable the network gate immediately after the test.
7. Record observed console state, physical fixture response, mapping used, destination, port, MagicQ version and any anomaly.

## Abort conditions

Abort immediately if:

- the readiness guard fails;
- workspace, Connection, destination or fixture mapping is uncertain;
- the console is running a production show;
- unexpected fixtures react;
- the operator loses manual control;
- network topology differs from the approved test plan.

## Certification result

Only mark the connector hardware-tested after the complete 0% → 50% → 0% sequence is physically observed on the intended fixture. UDP transmission alone must never be recorded as successful fixture execution.
