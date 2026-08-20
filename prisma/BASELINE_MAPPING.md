# SaaS V1 database baseline mapping

This document records the DEV-P0-004 translation from
`docs/baseline/03_DATABASE_SPEC.md` to `prisma/schema.prisma`. It does not amend
the baseline and is not a migration.

## Entity mapping

| Baseline group                         | Prisma models                                                                                                                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization and identity              | `Merchant`, `Brand`, `Store`, `Permission`, `Role`, `RolePermission`, `Staff`, `StaffIdentity`, `StaffStoreAssignment`, `PlatformAdmin`, `PlatformAdminIdentity`, `AuthSession`, `Consumer`, `ExternalIdentity`, `MerchantConsumer`, `MerchantCapability`                        |
| Mini program and payment configuration | `MiniProgramAccount`, `MiniProgramAuthorization`, `MiniProgramConfig`, `FeatureFlag`, `MiniProgramTemplate`, `MiniProgramReleaseJob`, `PaymentAccount`, `IntegrationHealth`                                                                                                      |
| Product and campaign                   | `Product`, `ProductVersion`, `PackageItem`, `ProductMedia`, `GroupBuyCampaign`, `GroupBuyCampaignVersion`, `CampaignStore`, `UsageRule`, `UsageWeeklyTimeRule`, `UsageBlackoutDate`, `PurchaseLimitRule`                                                                         |
| Inventory and commerce                 | `Inventory`, `InventoryReservation`, `InventoryAdjustment`, `Order`, `OrderItem`                                                                                                                                                                                                 |
| Payment and callback                   | `Payment`, `IntegrationCallbackRecord`                                                                                                                                                                                                                                           |
| Fee and fulfillment                    | `FeePolicy`, `FeeRecord`, `FeeReversal`, `FulfillmentRecord`, `Voucher`, `Redemption`, `RedemptionReversal`, `Refund`, `RefundItem`                                                                                                                                              |
| Reliability and governance             | `OrderEvent`, `EventOutbox`, `ReviewCase`, `RiskRule`, `RiskEvent`, `ExceptionRecord`, `CompensationJob`, `ReconciliationRun`, `ReconciliationMismatch`, `AuditLog`, `SecurityEvent`, `DisputeCase`, `MerchantRiskInvestigation`, `MerchantClearingCase`, `MerchantClearingItem` |

All 62 original entities and the four DEV-P0-006A approved identity/session
entities are represented. The Architecture
Baseline mentions a conceptual Payment Attempt capability, but the direct
Database Baseline defines `Payment` records as the multiple-attempt model and
does not define a separate `payment_attempt` table; no unapproved table was added.

## Relation and tenant mapping

- Core merchant-owned rows carry `merchant_id`.
- Tenant-sensitive references use `(id, merchant_id)` composite foreign keys,
  including Brand/Store, Staff/Role/Store, mini-program configuration, Product
  and Campaign versions, Inventory, Order/OrderItem, Payment, Voucher,
  Redemption, Refund, Fee and Fulfillment records.
- Global identities and governance definitions remain global where the baseline
  explicitly models them without a merchant owner.
- All declared relations use `Restrict`; no core transaction relation uses
  cascading deletion.

## Directly represented constraints

- UUID primary keys and separately unique readable business numbers.
- Integer minor-unit money fields use PostgreSQL `BIGINT`; no money field uses
  `Float` or `Double`.
- Tenant-aware composite unique keys and foreign keys.
- Staff multi-store scope uses tenant-aware Staff and Store composite foreign
  keys; AuthSession actor shape is enforced by a database CHECK.
- Provider transaction identity and refund provider identity uniqueness.
- Idempotency key uniqueness for reservation, payment, redemption, refund and
  compensation flows.
- `(order_item_id, issued_sequence)` voucher issuance uniqueness.
- `(payment_id, fee_type)` and `(fee_record_id, refund_id)` fee idempotency.
- PostgreSQL partial unique indexes for platform/merchant role codes, active
  mini-program authorization, published Product/Campaign versions, non-null
  payment sub-merchant identity, effective successful Payment and successful
  Redemption.
- Query indexes for tenant/status/time and the baseline's high-frequency business
  lookup paths.

## Enum mapping

All status/value sets explicitly enumerated in the database baseline are Prisma
enums. Status fields whose value set is not defined by the baseline remain
`String`; DEV-P0-004 does not invent additional business states.

## DEV-P0-005 PostgreSQL constraint status

The first reviewed PostgreSQL migration implements and integration-tests:

- Inventory, quantity, money, amount-arithmetic, usage-rule and time-range CHECK
  constraints.
- Payment `SUCCESS` immutability and the partial unique effective-success rule.
- Refund aggregate ceiling under a Payment row lock, Refund-to-Payment/Order
  composite scope, and RefundItem/Voucher scope validation.
- Voucher sequence uniqueness and the sequence upper bound against OrderItem
  quantity.
- Physical-delete prevention triggers for core transaction, audit, risk,
  exception and reconciliation facts.
- Tenant-aware composite foreign keys and the baseline partial unique indexes.

The following items remain deliberately deferred to their approved business
implementation phases:

1. Atomic inventory reserve/consume/release application operations.
2. Voucher Refund-versus-Redemption atomic state acquisition.
3. Voucher eventual issued-count equality, which needs idempotent fulfillment
   and reconciliation; the database already prevents duplicate/out-of-range
   sequences.
4. The V1 one-OrderItem application rule; the approved database remains 1:N for
   forward compatibility.
5. Transactional Outbox write orchestration and worker claiming with
   `FOR UPDATE SKIP LOCKED`.
6. Full business state-transition matrices beyond the database-enforced Payment
   SUCCESS immutability rule.
