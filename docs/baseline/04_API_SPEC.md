SaaS V1 API 规格书》
Baseline Version：V1.0
状态：V1 LOCKED

1. API 总体结构
/api/v1/

consumer/
merchant/
platform/
integrations/
内部 Worker V1 不通过公网 HTTP 执行。

2. API 通用规则
API-001｜Tenant
Consumer：
AppID / MiniProgramContext
→ MiniProgramAccount
→ Merchant
Merchant：
StaffSession
→ Staff
→ merchant_id
Platform：
只有 Platform API 可以显式选择 Target Merchant。
客户端提交的 merchant_id 不作为可信 Tenant 依据。

API-002｜业务动作接口
禁止把状态型核心业务设计成万能 PATCH。
错误：
PATCH /orders/{id}
{
  "status":"PAID"
}
正确：
create payment
cancel order
approve refund
redeem voucher
pause campaign

API-003｜幂等
关键动作支持：
Idempotency-Key
例如：
CreateOrder
CreatePayment
CancelOrder
CreateRefund
RedeemVoucher
AdjustInventory
ReviewApprove
ReleaseJob

3. 通用返回
成功：
{
  "data": {},
  "request_id": "..."
}
列表：
{
  "data": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100
  },
  "request_id": "..."
}
失败：
{
  "error": {
    "code": "VOUCHER_NOT_REDEEMABLE",
    "message": "当前团购券不可核销"
  },
  "request_id": "..."
}
业务逻辑不得依赖中文 message。

4. Consumer API
Bootstrap
GET /api/v1/consumer/bootstrap
用途：
识别 AppID
↓
Merchant
↓
Brand
↓
Config
↓
FeatureFlags

微信登录
POST /api/v1/consumer/auth/wechat
Request：
{
  "login_code": "..."
}
服务端解析可信微信身份。

5. 团购列表
GET /api/v1/consumer/group-buy-campaigns
返回当前 Tenant 下可公开展示团购。

6. 团购详情
GET /api/v1/consumer/group-buy-campaigns/{campaign_id}
返回：
Product
Package
Price
UsageRule
Store
RefundPolicy
PurchaseLimit
SaleStatus
下单时必须二次校验。

7. 创建订单
POST /api/v1/consumer/orders
Request：
{
  "campaign_id": "...",
  "quantity": 3
}
禁止客户端决定：
price
payable_amount
consumer_id
merchant_id

8. 创建支付
POST /api/v1/consumer/orders/{order_id}/payments
服务端读取：
Order.payable_amount
PaymentAccount
微信用户身份
返回微信小程序支付参数。
返回参数：
不代表支付成功。

9. 我的订单
GET /api/v1/consumer/orders
GET /api/v1/consumer/orders/{order_id}
只能当前：
Consumer + Tenant

10. 取消订单
POST /api/v1/consumer/orders/{order_id}/cancel
支付状态未知时不得直接关闭。

11. 我的券
GET /api/v1/consumer/vouchers
GET /api/v1/consumer/vouchers/{voucher_id}

12. 动态核销 Token
POST /api/v1/consumer/vouchers/{voucher_id}/redeem-token
Token：
短期
不可预测
Redis TTL
不得直接暴露内部 Voucher ID 作为核销凭证。

13. 退款
POST /api/v1/consumer/refunds
Request：
{
  "voucher_ids": ["...", "..."],
  "reason_code": "...",
  "reason_text": "..."
}
一次 Refund：
V1 只允许同一个 Order/Payment 下的券。
消费者不得传 refund amount。

14. Refund 查询
GET /api/v1/consumer/refunds/{refund_id}

15. Merchant Auth
POST /api/v1/merchant/auth/wechat
GET  /api/v1/merchant/bootstrap
Bootstrap 返回：
Staff
Role
Permission
Store
MerchantCapability
FeatureFlag

16. Merchant Product
GET  /api/v1/merchant/products
POST /api/v1/merchant/products
GET  /api/v1/merchant/products/{id}

POST /api/v1/merchant/products/{id}/versions
PUT  /api/v1/merchant/product-versions/{version_id}
已发布 Version 不直接编辑。

17. Campaign
POST /api/v1/merchant/campaigns
POST /api/v1/merchant/campaigns/{id}/versions

PUT /api/v1/merchant/campaign-versions/{version_id}

PUT /api/v1/merchant/campaigns/{id}/purchase-limit

POST /api/v1/merchant/campaigns/{id}/submit-review
POST /api/v1/merchant/campaigns/{id}/pause
POST /api/v1/merchant/campaigns/{id}/resume
POST /api/v1/merchant/campaigns/{id}/termination-request

18. Inventory
GET /api/v1/merchant/campaigns/{id}/inventory

POST /api/v1/merchant/campaigns/{id}/inventory-adjustments

PUT /api/v1/merchant/campaigns/{id}/inventory-settings
不得提供：
PUT sold_stock
PUT reserved_stock

19. Merchant Orders
GET /api/v1/merchant/orders
GET /api/v1/merchant/orders/{order_id}
STAFF 与 MANAGER 可返回不同字段。

20. Merchant Refund
GET /api/v1/merchant/refunds
GET /api/v1/merchant/refunds/{refund_id}

POST /api/v1/merchant/refunds/{id}/approve
POST /api/v1/merchant/refunds/{id}/reject
Approve：
Refund → APPROVED
而不是 SUCCESS。

21. Redemption
Preview：
POST /api/v1/merchant/redemptions/preview
Confirm：
POST /api/v1/merchant/vouchers/{voucher_id}/redeem
Confirm 必须重新完整验证。

22. Redemption Reversal
POST /api/v1/merchant/redemptions/{id}/reversal-request
原 Redemption 不删除。

23. Staff
GET  /api/v1/merchant/staff
POST /api/v1/merchant/staff

POST /api/v1/merchant/staff/{id}/change-role
POST /api/v1/merchant/staff/{id}/suspend
POST /api/v1/merchant/staff/{id}/mark-left

24. Merchant Stores
GET /api/v1/merchant/stores
V1 不提供：
POST /api/v1/merchant/stores
Store 属于平台基础资产。

25. Export
POST /api/v1/merchant/exports/orders
GET  /api/v1/merchant/exports/{id}
生成 ExportJob。
下载链接短期签名。

26. Analytics
GET /api/v1/merchant/analytics/overview
属于 Read Model。

27. Platform Merchant
GET  /api/v1/platform/merchants
POST /api/v1/platform/merchants
GET  /api/v1/platform/merchants/{id}

POST /api/v1/platform/merchants/{id}/activate
POST /api/v1/platform/merchants/{id}/suspend
POST /api/v1/platform/merchants/{id}/freeze
POST /api/v1/platform/merchants/{id}/restore
POST /api/v1/platform/merchants/{id}/terminate
高风险操作：
reason required
Audit required

28. Brand / Store
POST /api/v1/platform/merchants/{id}/brands
PUT  /api/v1/platform/brands/{id}

POST /api/v1/platform/merchants/{id}/stores
PUT  /api/v1/platform/stores/{id}

POST /api/v1/platform/stores/{id}/suspend
POST /api/v1/platform/stores/{id}/close

29. MiniProgram Admin
POST /api/v1/platform/merchants/{id}/mini-programs

POST /api/v1/platform/mini-programs/{id}/authorization-link

POST /api/v1/platform/mini-programs/{id}/sync

POST /api/v1/platform/mini-programs/{id}/configs

POST /api/v1/platform/mini-program-configs/{id}/publish

POST /api/v1/platform/mini-programs/{id}/release-jobs

GET /api/v1/platform/mini-program-release-jobs/{id}

30. Payment Account
POST /api/v1/platform/merchants/{id}/payment-accounts

POST /api/v1/platform/payment-accounts/{id}/validate

POST /api/v1/platform/payment-accounts/{id}/suspend

31. Review
GET /api/v1/platform/reviews
GET /api/v1/platform/reviews/{id}

POST /api/v1/platform/reviews/{id}/approve
POST /api/v1/platform/reviews/{id}/reject
POST /api/v1/platform/reviews/{id}/escalate

32. Fee Policy
GET  /api/v1/platform/fee-policies
POST /api/v1/platform/fee-policies
新费率：
创建新 Policy。
不得覆盖历史成交政策。

33. Platform Refund Exception
POST /api/v1/platform/refunds/{id}/exception-approve
用于：
已核销特殊退款
大额退款
高风险退款
冻结商户退款

34. Risk
GET /api/v1/platform/risk-events
GET /api/v1/platform/risk-events/{id}

POST /api/v1/platform/risk-events/{id}/resolve

35. Exception
GET /api/v1/platform/exceptions
GET /api/v1/platform/exceptions/{id}

POST /api/v1/platform/exceptions/{id}/assign
POST /api/v1/platform/exceptions/{id}/resolve
Resolve 不直接篡改 Payment 等事实。

36. Compensation
GET /api/v1/platform/compensation-jobs

POST /api/v1/platform/compensation-jobs/{id}/retry

37. Reconciliation
POST /api/v1/platform/reconciliation-runs

GET /api/v1/platform/reconciliation-runs/{id}

GET /api/v1/platform/reconciliation-runs/{id}/mismatches

38. Clearing
POST /api/v1/platform/merchants/{id}/investigations

POST /api/v1/platform/merchant-investigations/{id}/decide

POST /api/v1/platform/merchants/{id}/clearing-cases

39. Audit / Security
GET /api/v1/platform/audit-logs
GET /api/v1/platform/security-events
无 DELETE 接口。

40. Integration API
微信支付：
POST /api/v1/integrations/wechat-pay/payment-callback

POST /api/v1/integrations/wechat-pay/refund-callback
微信开放平台：
POST /api/v1/integrations/wechat-open-platform/events
以及官方协议要求的验证入口。
Integration API 不使用普通 Consumer/Staff JWT。

41. Payment Callback Contract
处理：
验证通知
解密
去重
转换 ProviderPaymentResult
调用 PaymentService.applyProviderResult()
必须校验：
交易号
Merchant
PaymentAccount
金额
币种
状态

42. Refund Callback Contract
处理：
验证
去重
转换 ProviderRefundResult
调用 RefundService.applyProviderResult()

43. Internal Worker Contract
V1 内部 Worker 不作为公网 API。
统一：
JobContext

job_id
job_type
target_id
merchant_id
idempotency_key
correlation_id
attempt
结果：
SUCCESS
RETRYABLE_FAILURE
FINAL_FAILURE
MANUAL_REVIEW

44. Worker Jobs
至少：
Outbox
OrderTimeout
PaymentConfirmation
RefundConfirmation
VoucherExpiry
InventoryReservationCheck
Compensation
Reconciliation
IntegrationHealth
MiniProgramRelease

45. API Error Code 规范
领域前缀：
AUTH_
TENANT_
PRODUCT_
CAMPAIGN_
INVENTORY_
ORDER_
PAYMENT_
REFUND_
VOUCHER_
REDEMPTION_
RISK_
PLATFORM_
INTEGRATION_
典型：
INVENTORY_SOLD_OUT
PURCHASE_LIMIT_REACHED
ORDER_ALREADY_CLOSED
PAYMENT_STATUS_UNCERTAIN
REFUND_AMOUNT_EXCEEDED
VOUCHER_WRONG_STORE
VOUCHER_ALREADY_REDEEMED
VOUCHER_REFUND_IN_PROGRESS
CROSS_TENANT_ACCESS_DENIED

46. API 核心安全规则
API-CORE-001 Tenant由可信上下文确定
API-CORE-002 金额由服务器确定
API-CORE-003 状态变化走 Action API
API-CORE-004 核心写接口幂等
API-CORE-005 Consumer只能访问Owner资源
API-CORE-006 Merchant API自动Tenant Scope
API-CORE-007 Platform跨租户操作必须Audit
API-CORE-008 Integration只信Provider验证结果
API-CORE-009 Provider Client返回SUCCESS不代表客户端支付SUCCESS
API-CORE-010 API版本从/v1开始
全部：
V1 LOCKED

47. Identity / Session / Tenant API 安全补充

API-AUTH-001｜Opaque Session
登录 Provider 验证成功后，经 Identity 解析 Actor，并签发至少 256-bit 随机 opaque
session token。API 只向客户端返回 raw token；持久层只保存 SHA-256 token hash。

API-AUTH-002｜Session 重校验
受保护请求必须校验 Session 状态、expires_at、Actor 当前状态，以及
permission_version_snapshot 与 Actor 当前 permission_version。失配统一拒绝授权。

API-TENANT-001｜Staff Tenant
Merchant API 的 Tenant 仅由 AuthSession → Staff → merchant_id 推导，不信任客户端提交
的 merchant_id。

API-TENANT-002｜Platform Target Tenant
只有具有所需 Platform Permission 的 PlatformActor 可以显式选择 target merchant，并据此
建立 TargetTenantContext；Merchant Actor 不得使用该能力。

API-STORE-001｜Staff Store Scope
Staff 可访问的 Store Scope 来自 ACTIVE staff_store_assignment；primary_store_id 只用于
默认门店选择。

API-RBAC-001｜初始权限映射
PLATFORM_SUPER_ADMIN 拥有所有已注册 Platform Permission。
PLATFORM_REVIEWER 至少拥有 merchant.view、merchant.review、campaign.view、
campaign.review、refund.view、risk.view、exception.view、audit.view_limited。
MERCHANT_ADMIN 至少拥有 product.view、product.manage、campaign.view、campaign.manage、
inventory.view、inventory.manage、order.view、refund.view、refund.review、voucher.view、
staff.view、staff.manage、store.view、analytics.view、export.order。
MERCHANT_STAFF 拥有 order.view_limited、voucher.view_limited、voucher.redeem、
store.view_assigned。

以上全部：V1 LOCKED

48. Merchant Lifecycle 与 Platform Management Permission

Platform Merchant 查询需要 merchant.view；创建需要 merchant.create；activate、suspend、
freeze、restore、terminate 需要 merchant.lifecycle.manage。Brand 查询/管理分别需要
brand.view/brand.manage；Store 查询/管理分别需要 store.view/store.manage；
MerchantCapability 查询/管理分别需要 merchant_capability.view/
merchant_capability.manage。

PLATFORM_REVIEWER 可读 Merchant、Brand、Store，但不得创建 Merchant、推进 Merchant
生命周期、管理 Brand/Store 或修改 MerchantCapability。Merchant Actor 不得使用任何
Platform Management Permission。状态：V1 LOCKED
