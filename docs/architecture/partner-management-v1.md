# Partner Management V1

## Purpose

Partner Management is a native Clara OS business capability for operating a B2B partner/referral program. Melodie Digital is the first production workspace, but the domain model must remain reusable by other Clara OS customers.

The goal is not to clone PartnerStack. The V1 provides the smallest reliable operating loop needed to attribute partners, leads and revenue, calculate commissions, and let Clara reason over the program.

**Product boundary:** Clara OS owns the business engine, persistence, APIs, audit trail and Clara capabilities. The partner-facing interface and portal belong exclusively to the Melodie Digital website currently under construction. Clara OS must not expose a `/partners` application page or Partner navigation entry.

## Core flow

`Partner → Referral → Contact/Lead → Deal → Revenue → Commission → Payout`

The model must preserve attribution history so a later subscription/revenue event can always be traced back to the originating partner and referral.

## Domain model

### Partner

Required fields:
- `id`
- `workspaceId`
- `name`
- `email`
- `companyName?`
- `type`: `REFERRER | RESELLER | INTEGRATOR`
- `status`: `INVITED | ACTIVE | PAUSED | REJECTED | ARCHIVED`
- `referralCode`
- `commissionPlanId?`
- `createdAt`
- `updatedAt`

### Referral

Required fields:
- `id`
- `workspaceId`
- `partnerId`
- `referralCode`
- `contactId?`
- `email?`
- `source?`
- `status`: `RECEIVED | QUALIFIED | CONVERTED | LOST`
- `createdAt`
- `convertedAt?`

### Deal attribution

Required fields:
- `id`
- `workspaceId`
- `partnerId`
- `referralId?`
- `contactId?`
- `externalDealId?`
- `offerCode?`
- `currency`
- `amount`
- `status`: `OPEN | WON | LOST`
- `createdAt`
- `closedAt?`

### Commission plan

Required fields:
- `id`
- `workspaceId`
- `name`
- `calculationType`: `PERCENTAGE | FIXED`
- `value`
- `durationMonths?`
- `appliesToOfferCode?`
- `active`

### Commission

Required fields:
- `id`
- `workspaceId`
- `partnerId`
- `dealAttributionId`
- `revenueReference?`
- `baseAmount`
- `currency`
- `commissionAmount`
- `status`: `PENDING | APPROVED | PAID | CANCELLED`
- `calculatedAt`
- `approvedAt?`
- `paidAt?`

## Invariants

1. A referral belongs to exactly one partner at creation time.
2. Attribution is append-only after a deal is won. Corrections must be explicit audit events, not silent rewrites.
3. Commission calculations are deterministic and reproducible from the plan and revenue amount used at calculation time.
4. Financial state changes are never autonomous WRITE/EXECUTE actions without Clara governance approval.
5. No API keys, payment credentials, OAuth tokens or other secrets are stored in the Partner domain.
6. Every record is scoped by `workspaceId` from V1.
7. Partner-facing website strings must be internationalized in FR/EN/ES/DE/IT at the website layer.

## Clara capability boundary

V1 exposes normalized business capabilities rather than coupling the Brain directly to storage.

Capabilities:
- `partners.list` — READ
- `partners.get` — READ
- `partners.create` — PREPARE/WRITE governed
- `partners.updateStatus` — WRITE governed
- `partners.referrals.list` — READ
- `partners.referrals.attribute` — WRITE governed
- `partners.deals.list` — READ
- `partners.commissions.calculate` — PREPARE
- `partners.commissions.approve` — WRITE governed
- `partners.commissions.markPaid` — WRITE governed
- `partners.performance.summary` — READ

The Brain may reason over partner performance, propose follow-up actions and prepare commission calculations. It must not bypass the existing approval/autonomy layer.

## Website portal boundary

The Melodie Digital website owns all partner-facing UI, including:
- partner account/portal access;
- referral link/code presentation;
- referrals and lead status;
- attributed sales/revenue visibility;
- commission visibility;
- partner documents/resources;
- onboarding and partner communication.

The website consumes the Partner Management service exposed by Clara OS through authenticated, workspace-scoped interfaces. The website must never become the source of truth for attribution or financial state.

Clara OS remains responsible for:
- partner business records;
- attribution rules;
- deal/revenue references;
- commission rules and deterministic calculations;
- audit trail;
- governance/approval boundaries;
- Clara capability exposure.

## Integration strategy

### Contacts

Partner referrals should link to the existing Clara OS Contact model when a contact exists. Avoid duplicating the entire contact record inside Partner Management.

### Stripe

Stripe may later provide subscription/revenue events and customer references. V1 domain code must not require Stripe to function; revenue attribution must support a normalized reference so other billing systems can be connected later.

### Make

Make can remain an extension layer for notifications, onboarding sequences or third-party workflows. Partner business truth stays in Clara OS.

### Brain / GPT

Partner Management is a Clara capability. GPT is only a cognitive provider behind the Brain and receives no independent authority over partner financial actions.

## Delivery slices

### Slice 1 — Foundation
- domain types and validation;
- persistence/store;
- commission calculation service;
- unit tests.

### Slice 2 — Service/API operations
- partner/referral/deal/commission APIs;
- workspace-scoped persistence;
- audit trail;
- website-consumable service boundary.

### Slice 3 — Clara capability exposure
- normalized capabilities;
- performance summary;
- governed write actions;
- audit events.

### Website workstream — separate repository/application
- partner portal UI;
- account/authentication experience;
- responsive dashboard;
- FR/EN/ES/DE/IT website translations;
- onboarding/resources;
- secure consumption of Clara OS Partner Management APIs.

### Deferred
- automatic payouts;
- public partner marketplace;
- complex tiers/bonuses;
- multi-level attribution;
- PartnerStack connector.

## Validation gate

Do not merge into `clara-os-commercial-finish` until:
- `npx tsc --noEmit` passes;
- production build passes;
- unit tests for attribution/commission rules pass;
- Partner Management does not add a Clara OS application page or navigation entry;
- existing Brain/GPT, Contacts, Lighting and Sound flows are unchanged;
- website-facing integration contract is documented and workspace-scoped.

Related issue: #93
