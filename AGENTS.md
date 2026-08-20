# AGENTS.md

# SaaS V1 Development Constitution

Version: V1.0
Status: ACTIVE
Project Stage: Pre-Development Baseline → Implementation

---

## 1. Purpose

This file defines the mandatory operating rules for any AI coding agent, developer, reviewer, automation, or Codex session working on this SaaS V1 project.

This project already has an approved V1 business baseline, architecture baseline, database specification, API specification, development plan, and testing/acceptance specification.

The coding agent must not redesign the product from scratch.

The coding agent's responsibility is to implement the approved V1 design safely, incrementally, and verifiably.

---

# 2. Source of Truth

Before performing implementation work, read the relevant baseline documents under:

`docs/baseline/`

Required baseline documents:

1. `01_BUSINESS_RULES.md`
2. `02_ARCHITECTURE.md`
3. `03_DATABASE_SPEC.md`
4. `04_API_SPEC.md`
5. `05_DEVELOPMENT_PLAN.md`
6. `06_TESTING_ACCEPTANCE.md`

These documents together form the SaaS V1 Development Baseline.

---

# 3. Authority Priority

If instructions appear inconsistent, use the following priority order:

1. Explicit current user instruction
2. V1 LOCKED business rules in `01_BUSINESS_RULES.md`
3. Architecture rules in `02_ARCHITECTURE.md`
4. Database rules in `03_DATABASE_SPEC.md`
5. API contracts in `04_API_SPEC.md`
6. Development sequencing in `05_DEVELOPMENT_PLAN.md`
7. Testing and acceptance requirements in `06_TESTING_ACCEPTANCE.md`
8. Existing implementation
9. Agent preference or framework convention

Existing code does NOT override a V1 LOCKED baseline rule.

If existing code conflicts with the baseline, report the conflict before changing business semantics.

---

# 4. V1 LOCKED Rule

Any rule marked:

`V1 LOCKED`

must be treated as a product/architecture decision.

The coding agent MUST NOT independently:

- change it;
- weaken it;
- replace it with a "simpler" design;
- remove it because implementation is inconvenient;
- silently reinterpret it.

If implementation reveals that a V1 LOCKED rule is technically impossible or seriously contradictory:

STOP the affected implementation work and report:

1. the rule involved;
2. the technical conflict;
3. affected modules;
4. safe options;
5. recommended option.

Do not make the commercial/product decision yourself.

---

# 5. Core Product Model

This is a multi-tenant local group-buy SaaS platform.

Core business chain:

Merchant
→ Brand
→ Store
→ Product
→ ProductVersion
→ GroupBuyCampaign
→ GroupBuyCampaignVersion
→ Inventory
→ Order
→ Payment
→ Voucher
→ Redemption / Refund

Consumer-facing mini programs use:

Unified Mini Program Template
+
Independent merchant AppID
+
Merchant-specific SaaS configuration
+
Shared SaaS Backend

Do not create one codebase per merchant.

---

# 6. V1 Order Model

V1 rule:

One Order purchases exactly one group-buy Campaign/Product type, with quantity N.

Allowed:

Campaign A × 3

Not supported in V1:

Campaign A × 2
+
Campaign B × 1
inside one Order.

Do not introduce cart/multi-product Order logic unless the baseline is formally changed.

---

# 7. Voucher Rule

Purchasing N units MUST generate N independent Vouchers.

Example:

quantity = 3

Result:

Voucher sequence 1
Voucher sequence 2
Voucher sequence 3

Do not replace this with a single Voucher containing quantity=3.

Voucher issuance must be idempotent.

The unique business identity must prevent duplicate voucher issuance for the same OrderItem sequence.

---

# 8. Money Safety Rules

The following rules are mandatory.

## MONEY-001

Frontend/client input must never determine trusted transaction amounts.

Price, payable amount, refund amount, fee, and other monetary facts are calculated or verified server-side.

## MONEY-002

All monetary values use integer smallest currency units.

For CNY:

¥99.90 = 9990

Do not use FLOAT/DOUBLE for money.

## MONEY-003

A real provider-confirmed Payment SUCCESS is an immutable payment fact.

Refunding an Order must NOT rewrite the successful Payment as FAILED.

## MONEY-004

One Order can have at most one business-effective successful Payment.

If a second real successful Payment exists:

- preserve the successful payment fact;
- `effective_for_order = false`;
- do not fulfill again;
- raise DUPLICATE_PAYMENT handling.

## MONEY-005

A provider transaction ID must not be booked more than once.

## MONEY-006

Payment provider amount must equal the expected Payment amount.

Amount mismatch must not trigger fulfillment.

## MONEY-007

Refund total/occupied amount must never exceed the original Payment amount.

Concurrent refunds must be protected transactionally.

## MONEY-008

Unknown provider result is NOT failure.

For uncertain Payment/Refund states:

query the provider before retrying destructive/create operations.

## MONEY-009

Do not blindly retry createPayment/createRefund when the external state may already exist.

Query first when the result is uncertain.

---

# 9. Inventory Safety Rules

Inventory is controlled server-side.

Core quantities:

total_stock
reserved_stock
sold_stock

For LIMITED inventory:

reserved_stock + sold_stock <= total_stock

Available stock is derived, not independently writable:

available_stock =
total_stock
- reserved_stock
- sold_stock

Order creation and inventory reservation must be transactional.

Concurrent purchase of the last stock must not oversell.

Do not directly expose arbitrary update APIs for:

sold_stock
reserved_stock

Inventory changes requiring manual intervention must use InventoryAdjustment and Audit.

---

# 10. Refund / Redemption Race Rule

This is a P0 money-safety rule.

For a normal unused Voucher:

Refund flow competes for:

UNUSED → REFUNDING

Redemption flow competes for:

UNUSED → REDEEMING / REDEEMED

The acquisition must use database atomic conditional update / equivalent locking.

A normal Voucher MUST NOT end with both:

Refund SUCCESS
AND
Redemption SUCCESS

The coding agent must never implement this as:

SELECT state
→ application check
→ normal UPDATE

without atomic concurrency protection.

---

# 11. Redemption Rules

Preview does not create a redemption fact.

Confirm must revalidate everything.

At Confirm time re-check at least:

- Voucher status
- Merchant
- Store scope
- Staff status
- Staff permissions
- Voucher validity
- refund state
- merchant capability

One Voucher may have at most one SUCCESS Redemption.

A successful Redemption must not be physically deleted.

Mistaken redemption is handled through RedemptionReversal.

---

# 12. Refund Rules

Refund is an independent entity.

Do not represent refund only by changing Order.status.

Refund must preserve:

- refund number
- Order
- Payment
- Voucher(s)
- amount
- reason
- approval
- provider refund ID
- provider state
- timestamps
- actors

V1 partial refund is Voucher-based.

One Refund in V1 may only include Vouchers belonging to the same Order/Payment.

On final refund failure, Voucher must return to its recorded `voucher_status_before_refund`, not blindly to UNUSED.

---

# 13. Tenant Isolation Rules

Merchant is the tenant root.

All merchant-owned core business data must carry merchant scope.

Do not trust client-provided merchant_id as the tenant authority.

Consumer API tenant comes from trusted mini-program context/AppID.

Merchant API tenant comes from authenticated Staff Session.

Platform API is the only normal business API allowed to explicitly operate across merchants.

Cross-tenant resource probing should generally behave as NOT_FOUND rather than confirming the resource exists.

Critical database relationships should use tenant-aware foreign keys where designed.

Never remove tenant filtering for convenience.

---

# 14. Identity and Permission Rules

Actors:

ConsumerActor
StaffActor
PlatformActor
SystemActor

Context must distinguish:

ActorContext
TenantContext
RequestContext

Staff permission decisions must not rely only on UI visibility.

Backend must validate permissions.

When Staff is suspended/disabled:

sensitive access must stop immediately, even if an older token has not naturally expired.

Use permission/status versioning or equivalent invalidation.

---

# 15. Architecture Style

V1 architecture:

Modular Monolith
+
PostgreSQL
+
Redis
+
Worker Process
+
Transactional Outbox

Do NOT introduce without explicit approval:

- microservices;
- Kubernetes;
- Kafka;
- service mesh;
- distributed transaction framework;
- event sourcing;
- one backend per merchant.

V1 simplicity is intentional.

---

# 16. Module Architecture

Core implementation modules live under:

`packages/modules/`

Expected domains include:

merchant
identity-access
consumer
product
commerce
inventory
payment
fulfillment
governance
mini-program

Third-party adapters live under:

`packages/integrations/`

Examples:

wechat-pay
wechat-open-platform

---

# 17. Layering Rules

Use the following conceptual layers:

domain/
application/
infrastructure/
presentation/

Allowed dependency direction:

Presentation
→ Application
→ Domain

Infrastructure
→ implements Domain/Application ports

Domain MUST NOT depend on:

- NestJS HTTP concepts;
- Prisma;
- Redis;
- WeChat SDK;
- Express/Fastify request objects;
- frontend code.

---

# 18. Controller Rules

Controllers must not contain core business logic.

Controllers may:

- authenticate/resolve context;
- validate DTO;
- call Application Service/Command;
- map result to API response.

Controllers MUST NOT directly perform:

`prisma.order.update(...)`

`prisma.payment.create(...)`

or equivalent core business persistence.

Controller → Prisma direct access is prohibited for core domain mutations.

---

# 19. Repository Rules

Repositories are persistence abstractions.

Repositories must not implement cross-domain orchestration.

Do not place an entire:

Payment success
→ update Order
→ update Inventory
→ create Voucher
→ create Fee

workflow inside a repository.

---

# 20. Cross-Domain Write Rules

A domain must not arbitrarily update another domain's core tables.

For important cross-domain state propagation use:

- Application contracts;
- domain/application events;
- Transactional Outbox;
- explicit orchestration where designed.

Example:

Payment succeeds
→ Payment state + PaymentSucceeded Outbox committed
→ handlers perform Order/Inventory/Fulfillment/Fee actions idempotently.

Do not create a MegaPaymentService that writes every business table directly.

---

# 21. Read Model Rule

Write-side boundaries are strict.

Read-side composition may be pragmatic.

Merchant Order Detail may aggregate:

Order
Payment
Voucher
Refund

through a Query Service / Read Model.

Do not introduce unnecessary domain call chains for read-only screens.

---

# 22. Provider Port Rule

Core domain/application code does not directly depend on WeChat SDK.

Payment defines a Provider Port.

Example capabilities:

createPayment()
queryPayment()
createRefund()
queryRefund()

WeChatPayProvider implements it.

Mini-program management similarly uses a provider abstraction for:

commitCode()
submitAudit()
queryAuditStatus()
release()

---

# 23. Provider Result Rule

Payment callback and active payment query must eventually enter the same internal provider-result handling path.

Do not implement two separate business-success code paths.

Same for refunds.

External callback payload must be validated and converted into internal contracts before reaching domain/application logic.

---

# 24. Callback Security

Integration callback endpoints do not use ordinary Consumer/Staff authentication.

They use the provider's required signature/certificate/token verification.

Invalid callback:

- must not modify Payment/Refund;
- may create SecurityEvent;
- must not expose internal stack traces/secrets.

Duplicate callbacks must be idempotent.

---

# 25. Transaction Rules

Use explicit transaction boundaries for critical operations.

A transaction that changes a core state and creates an Outbox event must use the SAME database transaction context.

Example:

Payment → SUCCESS
+
INSERT PaymentSucceeded event_outbox

must commit together.

Do not commit Payment first and write Outbox afterward outside the transaction.

---

# 26. Outbox Rules

Critical cross-module events use Transactional Outbox.

Outbox processing must be idempotent.

Multiple workers must not process the same task unsafely.

PostgreSQL locking patterns such as:

FOR UPDATE SKIP LOCKED

may be used where appropriate.

Failed tasks must not be silently deleted.

Support retry and DEAD_LETTER / manual review behavior.

---

# 27. Worker Rules

Worker is a separate process but uses the same application modules.

Worker must call Application Services.

Worker MUST NOT bypass domain/application logic to directly patch core transaction tables.

System-triggered actions use:

actor_type = SYSTEM

where audit/event attribution is needed.

---

# 28. Required Worker Responsibilities

V1 includes:

- Outbox processing
- Order timeout handling
- Payment confirmation
- Refund confirmation
- Voucher expiry
- Inventory reservation checks
- Compensation
- Reconciliation
- Integration health
- Mini-program release jobs

---

# 29. Retry Rules

Use bounded retries and exponential backoff where suitable.

Safe-to-retry queries include:

queryPayment
queryRefund
queryAuditStatus

Potentially dangerous create/action requests must not be blindly repeated if provider state is uncertain.

Unknown state should lead to confirmation/query logic.

Maximum retry must eventually result in:

MANUAL_REVIEW / DEAD_LETTER / Exception

not infinite retry.

---

# 30. Database Rules

Primary database:

PostgreSQL

ORM/Migration:

Prisma

Critical constraints must not exist only in comments.

Use database guarantees where designed:

- UNIQUE
- CHECK
- FK
- tenant-aware composite FK
- partial unique index
- transactions
- atomic conditional updates

SQLite is NOT an acceptable substitute for P0 PostgreSQL concurrency/constraint tests.

---

# 31. Migration Rules

Production-applied migrations are immutable.

Do not edit historical production migrations.

Add a new migration for changes.

Prefer backward-compatible migrations:

1. add compatible schema;
2. deploy compatible code;
3. backfill if needed;
4. tighten constraint later.

Never execute destructive production migration casually.

---

# 32. API Rules

API prefix:

`/api/v1`

Major groups:

consumer
merchant
platform
integrations

Core state transitions use action-oriented APIs.

Do not expose arbitrary state PATCH for:

Order
Payment
Refund
Voucher
Inventory

All API errors use stable business error codes.

Do not make frontend logic depend on Chinese message text.

---

# 33. Consumer API Rules

Consumer can only access owned resources in current tenant.

Server determines:

merchant
consumer
price
payable amount
refund amount
PaymentAccount

Consumer request must not control them.

---

# 34. Merchant API Rules

Merchant tenant comes from Staff Session.

Do not require normal merchant endpoints to accept trusted merchant_id.

Store creation is NOT exposed to merchants in V1.

Stores are platform-managed base assets.

---

# 35. Platform API Rules

Platform may operate across tenants only through explicit authorized Platform API flows.

High-risk operations require:

- permission;
- reason;
- AuditLog.

Examples:

merchant freeze
merchant termination
exception refund approval
fee policy change
platform user changes

Platform UI still must go through Platform API, not direct database access.

---

# 36. Mini Program Architecture Rule

One unified mini-program template serves multiple merchant AppIDs.

Merchant differences come from:

MiniProgramAccount
MiniProgramConfig
FeatureFlag
SaaS data

Do not fork/copy source code for each merchant.

---

# 37. Mini Program Runtime Rule

Trusted runtime/AppID context determines merchant.

Bootstrap resolves:

AppID
→ MiniProgramAccount
→ Merchant
→ Brand
→ ConfigVersion
→ FeatureFlags

A client-provided merchant_id is not trusted tenant authority.

---

# 38. Mini Program Release Rule

Release jobs are stateful/recoverable.

Do not implement:

commit
submit audit
wait
release

as one giant fragile synchronous request.

Release stages must be recoverable and persist progress.

---

# 39. Redis Rule

Redis may be used for:

- session;
- rate limit;
- cache;
- short-lived redeem token;
- temporary coordination.

Redis must not be the sole durable source of money/transaction facts.

---

# 40. File Storage Rule

Durable files use Object Storage.

Do not treat application local disk as permanent storage for:

product images
logos
banners
export files
merchant materials

---

# 41. Secret Rule

Secrets must not be stored in:

- Git;
- frontend code;
- API response;
- application logs;
- ordinary business database fields;
- Docker image layers.

Use runtime secret/environment injection or Secret Manager.

Database records may store `credential_ref`, not raw credential content.

---

# 42. Logging Rule

Use structured logging.

Important fields include:

request_id
correlation_id
merchant_id
actor_id
module
error_code

Sensitive values must be redacted.

Do not use uncontrolled `console.log()` for production diagnostics.

---

# 43. Correlation Rule

Critical workflows should preserve correlation IDs across:

API request
Payment
callback
Outbox
Worker
Voucher
Refund
Fee
Exception

This is required for incident investigation.

---

# 44. Environment Rule

Required environments:

LOCAL
TEST
STAGING
PRODUCTION

They must not share production-critical databases/secrets.

STAGING must not use Production PostgreSQL.

Official production mini-program must not accidentally point to staging API.

---

# 45. Deployment Rule

V1 does not require Kubernetes.

Preferred V1 production form:

containerized API
+
containerized Worker
+
Managed PostgreSQL
+
Managed Redis
+
Object Storage
+
HTTPS

API and Worker are separate processes.

---

# 46. Testing Rule

Testing priority:

P0 money/safety
>
P1 commercial completeness
>
P2 UX optimization

Implementation involving:

Payment
Refund
Voucher
Redemption
Inventory
Tenant

must include appropriate tests.

P0 PostgreSQL concurrency behavior must use real PostgreSQL integration tests.

---

# 47. Money Safety Gate

Real-money production launch is prohibited unless P0 safety tests pass.

P0 includes at minimum:

- no overselling;
- server-side money calculation;
- order transaction rollback;
- payment idempotency;
- callback verification;
- duplicate callback safety;
- amount verification;
- duplicate real payment handling;
- Payment SUCCESS immutability;
- N quantity = N vouchers;
- partial fulfillment recovery;
- refund amount ceiling;
- refund idempotency;
- refund/redemption atomic race protection;
- one successful redemption per voucher;
- FeeReversal idempotency;
- tenant isolation;
- consumer ownership isolation;
- staff suspension effectiveness;
- secret leakage checks;
- Outbox recovery;
- uncertain Payment/Refund compensation;
- reconciliation;
- backup restore;
- environment isolation;
- HTTPS.

Any required P0 failure means:

NO GO.

---

# 48. Development Execution Rule

Do not attempt to implement the complete SaaS in one task.

Work according to `05_DEVELOPMENT_PLAN.md`.

Each development task must have a bounded scope.

Before modifying files:

1. read this `AGENTS.md`;
2. read relevant baseline documents;
3. inspect current repository state;
4. inspect existing tests/migrations;
5. identify affected modules.

After implementation:

1. run relevant lint/typecheck/tests;
2. run required PostgreSQL integration tests if applicable;
3. report all changed files;
4. report all migrations;
5. report all commands executed;
6. report test results;
7. report unresolved issues;
8. explicitly state whether any V1 LOCKED rule was changed.

---

# 49. Required Codex Task Report

At the end of every implementation task, output:

## Task Summary

What was implemented.

## Files Changed

List created/modified files.

## Database Changes

List schema/migration changes.

## Commands Executed

List meaningful commands.

## Tests

List tests run and results.

## Architecture Compliance

Confirm relevant architecture rules were respected.

## V1 Locked Rules

State exactly:

`No V1 LOCKED rule was modified.`

or describe the conflict.

## Remaining Issues

Known issues / technical debt / blocked work.

## Commercial Decisions Needed

Only list decisions that genuinely require product/business approval.

## Recommended Git Commit

Provide a concise commit message.

---

# 50. Stop Conditions

Stop the current implementation and report instead of guessing if:

1. a requested change conflicts with V1 LOCKED rules;
2. two baseline documents materially conflict;
3. required production credential/secret is missing;
4. a destructive data migration is required without approval;
5. a business decision is genuinely undefined and cannot safely be inferred;
6. implementing the task would bypass a P0 safety rule.

Do not stop for ordinary technical implementation choices that can be safely resolved within the approved architecture.

---

# 51. Final Principle

The purpose of this project is not to produce code quickly at the expense of correctness.

The purpose is to build a small but genuinely usable commercial SaaS V1.

Prefer:

correct
safe
testable
recoverable
auditable
maintainable

over:

clever
over-engineered
prematurely distributed
hard to verify.

End of SaaS V1 AGENTS Constitution.
