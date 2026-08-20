《SaaS V1 数据库设计规格书》
Baseline Version：V1.0
Document Type：SaaS V1 Development Specification
状态：V1 LOCKED
本文档规定 SaaS V1 数据持久化模型、关键表、关系、唯一约束、事务原则及资金安全约束。实现可以在不改变业务含义的前提下调整代码组织，但不得擅自改变标记为 V1 LOCKED 的数据规则。

1. 数据库技术基线
正式主数据库：
PostgreSQL
ORM / Migration：
Prisma
缓存及临时数据：
Redis
Redis 不得成为以下数据的唯一真相源：
Order
Payment
Refund
Voucher
Inventory
Redemption
Fee

2. 数据类型规范
DB-TYPE-001｜主键
核心业务实体统一：
UUID
业务可读编号单独保存：
merchant_code
product_code
campaign_code
order_no
payment_no
refund_no
voucher_no
redemption_no
exception_no

DB-TYPE-002｜金额
所有人民币金额使用：
BIGINT
单位：
分
例如：
¥99.90 = 9990
禁止：
FLOAT
DOUBLE
参与资金计算。

DB-TYPE-003｜时间
真实时间点：
TIMESTAMPTZ
例如：
created_at
paid_at
succeeded_at
valid_until
本地营业时段：
TIME
自然日期：
DATE

DB-TYPE-004｜JSON
灵活配置和历史快照：
JSONB
适用于：
商品/规则快照
MiniProgramConfig
Audit before/after
RiskContext
Provider metadata
不得用 JSONB 替代：
金额
状态
merchant_id
order_id
payment_id
voucher_id
库存
有效期
等需要强查询和约束的字段。

3. 多租户规则
Tenant Root：
Merchant
所有核心商户业务表必须包含：
merchant_id
关键关系采用：
(id, merchant_id)
Composite Foreign Key。
例如：
Store.brand_id + merchant_id
→ Brand.id + merchant_id
数据库必须能够阻止：
Merchant A 的 Store 指向 Merchant B 的 Brand。

4. 第一组：组织与身份
4.1 merchant
核心字段：
id
merchant_code
display_name
legal_entity_name
business_license_no
contact_name
contact_phone
status
created_at
updated_at
状态：
PENDING_SETUP
ACTIVE
SUSPENDED
FROZEN
TERMINATED
正式转换：PENDING_SETUP→ACTIVE；ACTIVE→SUSPENDED/FROZEN；SUSPENDED→ACTIVE/FROZEN/
TERMINATED；FROZEN→ACTIVE/TERMINATED；PENDING_SETUP→TERMINATED。ACTIVE→TERMINATED
禁止，TERMINATED 为终态。
约束：
UNIQUE merchant_code
不得普通物理删除。

4.2 brand
id
merchant_id
brand_code
name
logo_file_id
status
约束：
UNIQUE(merchant_id, brand_code)
UNIQUE(id, merchant_id)

4.3 store
id
merchant_id
brand_id
store_code
name
address
longitude
latitude
contact_phone
business_hours_json
status
状态：
ACTIVE
SUSPENDED
CLOSED
约束：
UNIQUE(merchant_id, store_code)
UNIQUE(id, merchant_id)

5. RBAC
permission
核心：
permission_code UNIQUE
name
description
例如：
order.view
order.view_limited
voucher.redeem
refund.review
product.manage
inventory.manage
staff.manage
merchant.freeze
platform_fee.manage

role
支持：
PLATFORM
MERCHANT
平台角色：
merchant_id = NULL
商户角色：
merchant_id NOT NULL
使用 PostgreSQL Partial Unique Index 分别保证平台/商户角色代码唯一。

role_permission
PK(role_id, permission_id)

6. Staff
staff
核心：
id
merchant_id
primary_store_id
role_id
staff_code
display_name
status
permission_version
version
状态：
PENDING
ACTIVE
SUSPENDED
LEFT
员工不得因为离职而删除。

staff_identity
staff_id
provider
app_id
provider_subject_id
status
同一微信身份不得绑定多个 Staff。

7. Consumer
consumer
平台统一消费者实体。
不直接把 OpenID 当主身份。

external_identity
consumer_id
provider
app_id
provider_subject_id
约束：
UNIQUE(provider, app_id, provider_subject_id)

merchant_consumer
merchant_id
consumer_id
status
first_seen_at
last_seen_at
约束：
UNIQUE(merchant_id, consumer_id)

8. Merchant Capability
merchant_capability
一 Merchant 一条：
merchant_id PK

can_create_product
can_publish_product
can_accept_order
can_accept_payment
can_redeem_voucher
can_process_refund

version
Merchant Status 与 Capability 分离。

9. 小程序接入表
mini_program_account
id
merchant_id
brand_id
app_id

authorization_status
development_status
audit_status
release_status
overall_status

current_template_version
released_version
current_config_version
约束：
UNIQUE(app_id)
UNIQUE(id, merchant_id)

mini_program_authorization
一个小程序允许存在授权历史：
MiniProgramAccount 1 → N Authorization
字段：
authorization_status
authorization_scope_json
credential_ref
authorized_at
refreshed_at
revoked_at
同一 MiniProgramAccount：
同时最多一条 ACTIVE Authorization。
使用 Partial Unique Index。
Credential 只存 Secret 引用。

mini_program_config
mini_program_account_id
merchant_id
brand_id
config_version
config_json
status
published_at
约束：
UNIQUE(mini_program_account_id, config_version)
状态：
DRAFT
PUBLISHED
ARCHIVED

feature_flag
scope_type
scope_id
feature_code
enabled
config_json
约束：
UNIQUE(scope_type, scope_id, feature_code)

10. 小程序模板与发布
mini_program_template
template_id
template_version
source_draft_id
status
description

mini_program_release_job
mini_program_account_id
merchant_id
template_id
template_version
config_version
audit_id
status
attempt_count
last_error
状态：
PENDING
COMMITTING
EXPERIENCE_READY
AUDIT_SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
RELEASING
RELEASED
FAILED

11. Payment Account
payment_account
id
merchant_id
brand_id
mini_program_account_id

provider
sp_mchid
sub_mchid
sub_appid

onboarding_status
appid_binding_status
payment_permission_status
status

credential_ref
V1：
provider = WECHAT_PAY
推荐：
UNIQUE(provider, sub_mchid)
WHERE sub_mchid IS NOT NULL

12. Product
product
id
merchant_id
brand_id
product_code
product_type
status
current_published_version_id
V1：
product_type = GROUP_BUY

product_version
负责：
商品内容是什么。
字段：
product_id
merchant_id
version_no
title
subtitle
description
status
约束：
UNIQUE(product_id, version_no)
同一个 Product：
最多一个 PUBLISHED ProductVersion。

package_item
套餐明细：
product_version_id
item_name
quantity
unit
reference_price
description
sort_order

product_media
product_version_id
file_id
media_type
sort_order

13. Campaign
group_buy_campaign
负责：
这是哪场团购活动。
id
merchant_id
brand_id
product_id
campaign_code
status
current_published_version_id
pending_version_id
状态：
DRAFT
PENDING_REVIEW
APPROVED
ACTIVE
PAUSED
ENDED
TERMINATION_REQUESTED
TERMINATED
SOLD_OUT 不作为数据库 Campaign Status。

group_buy_campaign_version
负责：
这一版团购怎么卖。
campaign_id
merchant_id
product_version_id
version_no

reference_price
sale_price
currency

sale_start_at
sale_end_at

store_scope

refund_policy_code
expiry_policy_code
reservation_required

status
约束：
UNIQUE(campaign_id, version_no)
同 Campaign 最多一个：
PUBLISHED version

14. Campaign Store
campaign_store
必须属于：
CampaignVersion
而不是 Campaign。
这样 V1 和 V2 可支持不同门店。
PK(campaign_version_id, store_id)

15. Usage Rule
usage_rule
一 CampaignVersion 一条。
支持：
FIXED_RANGE
AFTER_PURCHASE
FIXED：
fixed_valid_from
fixed_valid_until
AFTER_PURCHASE：
valid_days_after_purchase
两种规则互斥。

usage_weekly_time_rule
weekday
all_day
start_time
end_time
enabled

usage_blackout_date
start_date
end_date
reason

16. Purchase Limit
purchase_limit_rule
属于：
Campaign
而不是 CampaignVersion。
原因：
Campaign 升级版本不能重置消费者历史限购。
字段：
single_order_limit
campaign_user_limit
status

17. Inventory
inventory
属于：
Campaign
字段：
inventory_mode
inventory_scope

total_stock
reserved_stock
sold_stock

low_stock_threshold
version
V1：
inventory_scope = CAMPAIGN
LIMITED：
total_stock IS NOT NULL
UNLIMITED：
total_stock IS NULL
必须：
reserved_stock >= 0
sold_stock >= 0
total_stock >= reserved_stock + sold_stock
可售库存不单独存：
available =
total_stock
- reserved_stock
- sold_stock

18. Inventory Reservation
inventory_reservation
reservation_no
merchant_id
inventory_id
order_id
quantity
status
idempotency_key
reserved_at
expires_at
consumed_at
released_at
release_reason
状态：
ACTIVE
CONSUMED
RELEASED
约束：
UNIQUE(order_id, inventory_id)
UNIQUE(merchant_id, idempotency_key)

19. Inventory Adjustment
inventory_adjustment
人工/系统库存变化流水。
类型：
MANUAL_INCREASE
MANUAL_DECREASE
SYSTEM_RESTORE
SYSTEM_CORRECTION
不得直接后台裸改：
sold_stock
reserved_stock

20. Orders
orders
id
order_no
merchant_id
brand_id
consumer_id

order_type
status

original_amount
merchant_discount_amount
platform_discount_amount
other_discount_amount
payable_amount
currency

payment_deadline_at

version

created_at
paid_at
fulfilled_at
closed_at
updated_at
V1：
order_type = GROUP_BUY

order_item
V1 Application 限制：
每 Order 一条 OrderItem。
数据库保留未来一对多能力。
字段：
order_id
merchant_id

product_id
product_version_id

campaign_id
campaign_version_id

product_name_snapshot
unit_price_snapshot
quantity
subtotal_amount

package_snapshot_json
usage_rule_snapshot_json
refund_policy_snapshot_json
expiry_policy_snapshot_json

21. Payment
payment
payment_no

merchant_id
order_id
consumer_id
payment_account_id

provider
status
effective_for_order

amount
currency

provider_transaction_id
idempotency_key

version
状态：
CREATED
PROCESSING
CONFIRMING
SUCCESS
FAILED
CLOSED
EXCEPTION

DB-PAY-001
外部交易号唯一：
UNIQUE(provider, provider_transaction_id)
非空时生效。

DB-PAY-002
同一 Order：
最多一个 SUCCESS + effective_for_order=true Payment。
使用 Partial Unique Index。
第二笔真实成功 Payment：
SUCCESS
effective_for_order=false
并进入异常中心。

22. Integration Callback
integration_callback_record
provider
callback_type
merchant_id

external_event_id
external_transaction_id

verification_status
processing_status

request_digest

received_at
processed_at
重复通知必须可去重。

23. Fee
fee_policy
scope_type
scope_id
fee_type

rate_value
rate_scale

priority
effective_from
effective_until
status
费率使用：
BASIS_POINT
PPM
禁止浮点。

fee_record
merchant_id
order_id
payment_id
fee_policy_id
fee_type

base_amount
rate_value_snapshot
rate_scale_snapshot
fee_amount

status
约束：
UNIQUE(payment_id, fee_type)

fee_reversal
fee_record_id
refund_id
base_refund_amount
reversal_amount
status
约束：
UNIQUE(fee_record_id, refund_id)

24. Fulfillment
fulfillment_record
merchant_id
order_id
order_item_id

fulfillment_type
expected_quantity
issued_quantity

status
attempt_count
last_error
约束：
UNIQUE(order_item_id, fulfillment_type)
V1：
fulfillment_type = VOUCHER

25. Voucher
voucher
voucher_no

merchant_id
brand_id

order_id
order_item_id

campaign_id
campaign_version_id
product_version_id

purchaser_consumer_id
holder_consumer_id

issued_sequence
status

valid_from
valid_until

usage_rule_snapshot_json
refund_policy_snapshot_json
expiry_policy_snapshot_json

redeem_code_hash

redeemed_store_id
redeemed_at

version
约束：
UNIQUE(voucher_no)
UNIQUE(order_item_id, issued_sequence)

26. Voucher 状态
UNUSED
REDEEMING
REDEEMED
REFUNDING
REFUNDED
EXPIRED
VOID
REDEEM_REVERSAL_PENDING

27. Redemption
redemption
redemption_no
merchant_id
voucher_id
order_id
store_id
staff_id

redeem_method
status

request_id
idempotency_key

started_at
confirmed_at
failed_at
方法：
QR
CODE
状态：
PROCESSING
SUCCESS
FAILED
约束：
每 Voucher 最多一个 SUCCESS Redemption。
使用 Partial Unique Index。

28. Redemption Reversal
redemption_reversal
merchant_id
redemption_id
voucher_id

requested_by_type
requested_by_id
approved_by_type
approved_by_id

reason_code
reason_text

status

requested_at
approved_at
completed_at
rejected_at
原 Redemption 永远保留。

29. Refund
refund
refund_no

merchant_id
order_id
payment_id
consumer_id

refund_type
status

amount
currency

reason_code
reason_text

provider_refund_id

requested_by_type
requested_by_id
approved_by_type
approved_by_id

idempotency_key
version
类型：
NORMAL
EXPIRED_VOUCHER
DUPLICATE_PAYMENT
POST_REDEMPTION_EXCEPTION
MERCHANT_CLEARING
状态：
REQUESTED
POLICY_CHECKING
MANUAL_REVIEW
APPROVED
PROCESSING
CONFIRMING
SUCCESS
FAILED
REJECTED

refund_item
refund_id
merchant_id
order_item_id
voucher_id
refund_amount
voucher_status_before_refund
约束：
UNIQUE(refund_id, voucher_id)
voucher_status_before_refund 用于失败恢复：
UNUSED
EXPIRED
REDEEMED

30. Refund 金额约束
同一 Payment：
SUCCESS Refund
+
APPROVED
+
PROCESSING
+
CONFIRMING
等已经占用的退款额度加当前拟退款金额，不得超过：
Payment.amount
必须在数据库事务内加锁检查。

31. 退款/核销互斥
核销：
UPDATE voucher
WHERE status='UNUSED'
→ REDEEMING
退款：
UPDATE voucher
WHERE status IN (...)
→ REFUNDING
必须使用条件原子更新。
禁止：
SELECT
↓
业务判断
↓
普通 UPDATE

32. Order Event
order_event
保存用户/运营可理解的业务时间线。
例如：
ORDER_CREATED
INVENTORY_RESERVED
PAYMENT_CREATED
PAYMENT_SUCCEEDED
VOUCHERS_ISSUED
REFUND_REQUESTED
REFUND_SUCCEEDED
ORDER_CLOSED

33. Event Outbox
event_outbox
merchant_id
event_type
aggregate_type
aggregate_id
payload_json

status
attempt_count
next_attempt_at

created_at
processed_at
状态：
PENDING
PROCESSING
PROCESSED
FAILED
DEAD_LETTER
必须与关键 Domain 状态同事务写入。

34. Review
review_case
保存：
target_type
target_id
target_version

review_type
status
risk_level

submitted_by
reviewed_by

result
reason
note
审核历史不得覆盖删除。

35. Risk
risk_rule
场景：
PRE_ORDER
PRE_PAYMENT
POST_PAYMENT
REFUND
REDEMPTION
MERCHANT
REVIEW
Action：
ALLOW
REVIEW
BLOCK
ESCALATE

risk_event
记录真实命中风控事件。

36. Exception
exception_record
核心异常类型包括：
PAYMENT_MISMATCH
DUPLICATE_PAYMENT
PAYMENT_CONFIRM_TIMEOUT

VOUCHER_ISSUE_FAILED
VOUCHER_COUNT_MISMATCH
VOUCHER_OVER_ISSUED

REFUND_CONFIRM_TIMEOUT
REFUND_STATE_MISMATCH

INVENTORY_MISMATCH
INVENTORY_RESERVATION_LEAK

REDEMPTION_STATE_MISMATCH

FEE_CALCULATION_ERROR
RECONCILIATION_ERROR

37. Compensation
compensation_job
job_type
target_type
target_id
status
idempotency_key

attempt_count
max_attempts
next_retry_at

last_error
exception_record_id
达到最大重试：
MANUAL_REVIEW
禁止无限循环。

38. Reconciliation
reconciliation_run
类型至少：
PAYMENT_ORDER
REFUND_VOUCHER
ORDER_VOUCHER
INVENTORY_ORDER
FEE_SETTLEMENT

reconciliation_mismatch
记录：
expected
actual
entity
status
exception_record_id
对账不得静默篡改核心交易数据。

39. Audit
audit_log
必须记录：
actor
merchant
action
target
before
after
reason
request_id
correlation_id
metadata
created_at
不得普通删除。

40. Security
security_event
例如：
CROSS_TENANT_ACCESS_ATTEMPT
INVALID_TOKEN
LOGIN_FAILURE_BURST
REDEEM_CODE_BRUTE_FORCE
INVALID_PAYMENT_CALLBACK

41. Dispute / Clearing
包括：
dispute_case
merchant_risk_investigation
merchant_clearing_case
merchant_clearing_item
商户清退不得直接删除核心历史。

42. Integration Health
integration_health
用于记录：
MINIPROGRAM_AUTH
MINIPROGRAM_RELEASE
WECHAT_PAYMENT_ACCOUNT
WECHAT_CALLBACK
状态：
UNKNOWN
HEALTHY
DEGRADED
ERROR

43. 删除规则
核心交易事实：
Order
Payment
Refund
Voucher
Redemption
FeeRecord
Audit
Risk
Exception
Reconciliation
禁止普通物理删除。
关系：
ON DELETE RESTRICT / NO ACTION
不得：
Order DELETE CASCADE Payment

44. Migration 基线
建议 Migration 按依赖分批。
已经进入生产环境的 Migration：
不修改，只增加新的 Migration。

45. 数据库最高安全规则
DB-CORE-001 不超卖
DB-CORE-002 金额整数分
DB-CORE-003 Payment SUCCESS 不可伪造回退
DB-CORE-004 一 Order 只一个有效成功支付
DB-CORE-005 外部支付交易号唯一
DB-CORE-006 N份=N券
DB-CORE-007 一券一成功核销
DB-CORE-008 Refund/Redeem 原子互斥
DB-CORE-009 Refund累计不得超付
DB-CORE-010 Outbox 与核心状态同事务
DB-CORE-011 Tenant核心关系数据库级隔离
DB-CORE-012 核心交易数据不可普通物理删除
全部：
V1 LOCKED

46. Identity / Tenant / RBAC 数据库补充

staff_store_assignment：
id、merchant_id、staff_id、store_id、status、created_at、updated_at。
status：ACTIVE、DISABLED。
UNIQUE(staff_id, store_id)。
(staff_id, merchant_id) → staff(id, merchant_id)。
(store_id, merchant_id) → store(id, merchant_id)。
primary_store_id 保留且仅代表默认/主要门店。

platform_admin：
id、admin_code、display_name、status、role_id、permission_version、created_at、updated_at。
status：ACTIVE、SUSPENDED、DISABLED。PlatformAdmin 不含 merchant_id；role_id 必须引用
merchant_id IS NULL 的 Platform Role。

platform_admin_identity：
id、platform_admin_id、provider、provider_subject_id、status、created_at、updated_at。
UNIQUE(provider, provider_subject_id)。

auth_session：
id、actor_type、consumer_id、staff_id、platform_admin_id、token_hash、status、
permission_version_snapshot、issued_at、expires_at、revoked_at、last_seen_at、created_at、
updated_at。actor_type：CONSUMER、STAFF、PLATFORM。status：ACTIVE、REVOKED、EXPIRED。
token_hash UNIQUE。CHECK 必须保证每个 actor_type 仅对应一个非空 Actor FK；数据库禁止
保存 raw token 字段。expires_at 必须晚于 issued_at；REVOKED 状态必须记录 revoked_at。

初始 Role Code：
PLATFORM_SUPER_ADMIN、PLATFORM_REVIEWER、MERCHANT_ADMIN、MERCHANT_STAFF。
角色权限通过 role、permission、role_permission 数据驱动。

以上全部：V1 LOCKED

47. Platform Management Permission 数据

正式 Permission Code：merchant.view、merchant.create、merchant.lifecycle.manage、
brand.view、brand.manage、store.view、store.manage、merchant_capability.view、
merchant_capability.manage。

PLATFORM_SUPER_ADMIN 通过集中式 Registry 拥有全部已注册 Platform Permission。
PLATFORM_REVIEWER 拥有 merchant.view、merchant.review、brand.view、store.view 以及既有
Review 权限，但不得获得 merchant.create、merchant.lifecycle.manage、brand.manage、
store.manage、merchant_capability.manage。
MERCHANT_ADMIN 与 MERCHANT_STAFF 不得获得任何 Platform Management Permission。
Permission 和 RolePermission 数据必须通过可重复执行的 seed/fixture 建立，不依赖人工插入。
状态：V1 LOCKED
