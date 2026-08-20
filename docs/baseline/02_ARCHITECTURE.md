《SaaS V1 系统架构设计基线源稿》
Baseline Version：V1.0
Document Type：SaaS V1 Development Baseline
状态：V1 LOCKED

第一章：总体目标
系统采用：
模块化单体 + 多租户 SaaS + 统一微信小程序模板 + 独立 Worker + PostgreSQL 强一致交易核心。
V1 优先级：
正确性
>
资金安全
>
数据隔离
>
可靠性
>
可维护性
>
扩展性
>
性能极致优化

第二章：总体系统地图
消费者
   ↓
微信小程序
   ↓
Consumer API
   │
   │
   ├───────────────┐
   ↓               ↓
Application      微信支付
Modules          微信开放平台
   │
   ↓
PostgreSQL
   ↑
   │
Worker
   │
   ├─ Outbox
   ├─ Timeout
   ├─ Payment Confirm
   ├─ Refund Confirm
   ├─ Voucher Expiry
   ├─ Compensation
   ├─ Reconciliation
   └─ MiniProgram Release


商家
 ↓
Merchant Web
 ↓
Merchant API


平台运营
 ↓
Platform Web
 ↓
Platform API

第三章：核心领域
系统核心领域划分为：
Merchant
Identity / Access
Consumer
Product
Commerce
Inventory
Payment
Fulfillment
Governance
MiniProgram
Integration
其中核心交易链：
Product
↓
Campaign
↓
Inventory
↓
Order
↓
Payment
↓
Voucher
↓
Redemption / Refund

第四章：Merchant Domain
负责：
Merchant
Brand
Store
Merchant lifecycle
基础经营配置
不负责：
订单
支付
退款
券

第五章：Identity & Access
负责：
Consumer Identity
Staff Identity
Platform Admin
Role
Permission
Session
ActorContext
TenantContext
Actor 类型：
ConsumerActor
StaffActor
PlatformActor
SystemActor

第六章：Product Domain
负责：
Product
ProductVersion
Campaign
CampaignVersion
CampaignStore
Campaign审核状态
历史交易引用 Version，而不是只引用当前 Product。

第七章：Inventory Domain
负责：
Inventory
InventoryReservation
InventoryAdjustment
核心：
available =
total
- reserved
- sold
关键修改必须数据库原子执行。

第八章：Commerce Domain
负责：
Order
OrderItem
订单状态
订单价格快照
购买限制协调
V1：
1 Order
→ 1 Campaign
→ quantity N

第九章：Payment Domain
负责：
Payment
PaymentAttempt
Provider result
Payment状态
有效成功支付判断
Refund
RefundItem
Payment 不直接依赖微信 SDK。
定义：
PaymentProvider
Port。

第十章：Fulfillment Domain
负责：
Voucher
FulfillmentRecord
Redemption
RedemptionReversal
Voucher生命周期
PaymentSucceeded 后通过 Event/Outbox 驱动履约。

第十一章：Governance Domain
负责：
Review
Risk
Exception
Fee
FeeReversal
Reconciliation
Audit
Merchant clearing/termination
Governance 是旁路治理能力，不成为万能业务模块。

第十二章：MiniProgram Domain
负责：
MiniProgramAccount
MiniProgramAuthorization
MiniProgramConfig
ConfigVersion
FeatureFlag
TemplateVersion
ReleaseJob
IntegrationHealth
SaaS 与小程序之间通过 Config/Bootstrap 解耦。

第十三章：Integration
负责第三方技术协议：
WeChat Pay
WeChat Open Platform
核心业务 Domain 不理解微信原始 JSON。
架构：
Wechat
↓
Adapter
↓
Provider Result / Internal Contract
↓
Application
↓
Domain

第十四章：多租户架构
Tenant Root：
Merchant
关键业务表携带：
merchant_id
并在适合的关系上采用：
Composite Foreign Key
防止跨 Tenant 错关联。
API 查询必须自动 Scope 到 Tenant。

第十五章：数据库
正式数据库：
PostgreSQL
原因包括：
事务
行锁
部分唯一索引
复杂约束
JSONB
成熟生产能力

第十六章：数据库原则
核心规则：
DB-001
所有金额使用整数最小货币单位。

DB-002
核心交易表使用不可预测 ID。

DB-003
关键状态使用明确枚举/约束。

DB-004
交易事实尽量不可覆盖。

DB-005
使用 created_at / updated_at。

DB-006
关键历史采用 Event/Audit/Reversal，而不是删除。

DB-007
Tenant数据必须有 merchant_id。

DB-008
核心唯一性尽可能由数据库保障。

第十七章：关键实体关系
Merchant
├─ Brand
├─ Store
├─ Staff
├─ Product
│   └─ ProductVersion
├─ Campaign
│   ├─ CampaignVersion
│   ├─ CampaignStore
│   └─ Inventory
│
├─ Order
│   ├─ OrderItem
│   ├─ Payment
│   │   └─ Refund
│   └─ Voucher
│       └─ Redemption
│           └─ RedemptionReversal
│
├─ FeeRecord
├─ RiskEvent
├─ ExceptionRecord
├─ AuditLog
└─ MiniProgramAccount

第十八章：关键数据库唯一约束
包括：
provider_transaction_id UNIQUE

Payment effective_for_order
→ 每Order最多一个

Voucher(order_item_id, sequence_no)
→ UNIQUE

有效 Redemption
→ 每Voucher最多一个

Refund Provider refund id
→ UNIQUE

Fee(payment_id, fee_type)
→ UNIQUE
必要时使用 PostgreSQL Partial Unique Index。

第十九章：事务架构
定义：
TransactionManager
TransactionContext
一个业务事务内：
Repository A
Repository B
OutboxRepository
必须共享同一个数据库事务。

第二十章：Transactional Outbox
关键状态：
Payment SUCCESS
+
PaymentSucceeded EventOutbox
必须同事务提交。
Worker 后续消费。
解决：
数据库成功
但应用在发事件前宕机
的问题。

第二十一章：API 总结构
/api/v1/

consumer/
merchant/
platform/
integrations/

第二十二章：Consumer API
负责：
Auth
Bootstrap
Campaign
Order
Payment
Voucher
Refund
消费者只能访问自己的资源。

第二十三章：Merchant API
负责：
Merchant profile
Brand
Store
Product
Campaign
Inventory
Order
Refund
Redemption
Staff
Export
Analytics
全部受：
Actor
Permission
Tenant
Store Scope
控制。

第二十四章：Platform API
负责：
Merchant lifecycle
Review
MiniProgram
PaymentAccount
FeePolicy
Risk
Exception
Reconciliation
Clearing
Audit
Security
平台敏感操作必须 Audit。

第二十五章：Integration API
公网入口尽量少。
核心：
POST /api/v1/integrations/wechat-pay/payment-callback

POST /api/v1/integrations/wechat-pay/refund-callback

POST /api/v1/integrations/wechat-open-platform/events
以及微信协议要求的验证入口。

第二十六章：微信支付架构
Payment Domain 定义：
PaymentProvider
Integration 实现：
WeChatPayProvider
能力：
createPayment()
queryPayment()
createRefund()
queryRefund()
Application 不直接调用微信 SDK。

第二十七章：支付确认统一入口
无论：
微信 Callback
还是：
主动 queryPayment
最终都转换成：
ProviderPaymentResult
并调用：
PaymentService.applyProviderResult()
避免两套成功逻辑。

第二十八章：退款确认统一入口
同理：
refund callback
queryRefund
统一：
ProviderRefundResult
↓
RefundService.applyProviderResult()

第二十九章：微信开放平台
第三方平台负责：
商户授权
Authorization凭证管理
模板管理
代码上传
提交审核
审核状态查询
发布
授权撤销
授权 Credential 存 SecretStore，不进入普通业务表明文。

第三十章：小程序发布状态机
ReleaseJob：
PENDING
↓
COMMITTING
↓
EXPERIENCE_READY
↓
AUDIT_SUBMITTED
↓
UNDER_REVIEW
↓
APPROVED
↓
RELEASING
↓
RELEASED
失败：
RETRYABLE
FAILED
MANUAL_REVIEW
每一步可恢复，不从头乱跑。

第三十一章：小程序配置架构
统一模板不能写死：
Merchant ID
Brand
API URL
Feature
启动：
微信可信运行上下文
↓
Bootstrap
↓
MiniProgramAccount
↓
Merchant
↓
ConfigVersion
↓
FeatureFlag

第三十二章：Worker
独立：
apps/worker
但不是微服务。
与 API 使用相同 Application Modules。
Worker 包括：
OutboxWorker
OrderTimeoutWorker
PaymentConfirmWorker
RefundConfirmWorker
VoucherExpiryWorker
InventoryCheckWorker
CompensationWorker
ReconciliationWorker
IntegrationHealthWorker
MiniProgramReleaseWorker

第三十三章：Worker Contract
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

第三十四章：重试策略
采用：
Exponential Backoff
+
Maximum Retry
但第三方资金操作区别：
安全查询：
queryPayment
queryRefund
queryAudit
可以重试。
状态未知的创建类操作：
createPayment
createRefund
release
不能盲重试。
先查询真实状态。

第三十五章：Dead Letter
连续失败任务进入：
DEAD_LETTER
同时：
Exception Center
不删除失败记录。

第三十六章：补偿
主要包括：
Voucher issue compensation
Payment confirmation
Refund confirmation
Inventory reservation reconciliation
Release job recovery
补偿必须幂等。

第三十七章：对账架构
至少：
PAYMENT_ORDER
ORDER_VOUCHER
REFUND_VOUCHER
VOUCHER_REDEMPTION
INVENTORY_ORDER
未来：
FEE_SETTLEMENT
WECHAT_STATEMENT

第三十八章：工程技术栈
正式锁定：
Language
TypeScript

Backend
NestJS

Database
PostgreSQL

ORM / Migration
Prisma

Redis
Redis

Merchant Web
Next.js + React

Platform Web
Next.js + React

Consumer
微信原生小程序 + TypeScript

Repository
Monorepo

Deployment
Docker

Testing
Vitest/Jest + Integration/E2E

第三十九章：Monorepo
saas-platform/
│
├── apps/
│   ├── api/
│   ├── worker/
│   ├── merchant-web/
│   ├── platform-web/
│   └── miniapp/
│
├── packages/
│   ├── modules/
│   ├── integrations/
│   ├── database/
│   ├── contracts/
│   ├── core/
│   ├── api-client/
│   ├── ui/
│   ├── observability/
│   ├── testing/
│   └── config/
│
├── prisma/
├── docs/
└── infra/

第四十章：模块内部四层
domain/
application/
infrastructure/
presentation/
依赖：
Presentation
↓
Application
↓
Domain

Infrastructure
→ implements Domain ports
Domain 不依赖：
NestJS
Prisma
Redis
Wechat SDK
HTTP

第四十一章：工程依赖规则
正式锁定：
ARCH-DEP-001
Controller不得直接调用Prisma。

ARCH-DEP-002
Domain不得import Infrastructure。

ARCH-DEP-003
模块不得直接操作其他领域核心表。

ARCH-DEP-004
跨领域写操作使用Application Contract/Event。

ARCH-DEP-005
前端不得import Domain/Prisma。

ARCH-DEP-006
Integration实现Provider Port。

ARCH-DEP-007
Worker调用Application Service，不直接修改核心交易状态。

ARCH-DEP-008
Repository不承载跨领域业务流程。

第四十二章：CQRS原则
不引入复杂 CQRS 框架。
采用：
写模型严格，读模型灵活。
Command：
CreateOrder
ApproveRefund
RedeemVoucher
Query：
GetOrderDetail
ListCampaigns
GetAnalytics
复杂后台查询允许 Read Model 跨表组合。

第四十三章：Domain Event
Event 使用过去式：
PaymentSucceeded
RefundSucceeded
VoucherRedeemed
VouchersIssued
MerchantFrozen
Event 表示：
已发生事实。

第四十四章：错误体系
Domain 抛：
VoucherNotRedeemableError
PaymentAmountMismatchError
不能抛：
Nest BadRequestException
Presentation 再转换：
HTTP Status
+
Business Error Code

第四十五章：Request Context
统一：
RequestContext

request_id
correlation_id
actor
tenant
locale
支持：
日志
审计
安全
跨任务追踪

第四十六章：部署
V1：
API ×1
Worker ×1
Managed PostgreSQL
Managed Redis
Object Storage
保持 API 无状态。
未来可以：
Load Balancer
↓
API ×N
Worker ×N
无需重写 Domain。

第四十七章：环境
正式：
LOCAL
TEST
STAGING
PRODUCTION
完全隔离：
Database
Redis
Object Storage
Secrets
Staging 禁止连接 Production DB。

第四十八章：小程序环境
映射：
开发版
→ LOCAL/STAGING

体验版
→ STAGING

正式版
→ PRODUCTION
正式小程序发布前进行：
Release Validation
防止正式版指向 Staging。

第四十九章：Secret
禁止：
Git
Frontend
普通数据库字段
Docker Image
Log
存放 Secret。
使用：
Environment Injection
/
Secret Manager

第五十章：Redis
Redis 用于：
Cache
Session
RateLimit
临时Token
短期状态
禁止作为：
Order
Payment
Refund
Voucher
唯一真相源。

第五十一章：Object Storage
存：
商品图
Logo
Banner
审核材料
导出文件
应用服务器本地磁盘不作为永久文件存储。

第五十二章：日志
统一 Structured Logging。
至少包含：
request_id
correlation_id
merchant_id
actor_id
module
error_code
敏感字段统一 Redact。

第五十三章：监控
技术指标：
API latency
5xx
CPU
Memory
DB connections
Worker backlog
Redis
业务指标：
支付成功率
Payment CONFIRMING
Refund CONFIRMING
Outbox backlog
发券失败
核销失败
Critical Exception

第五十四章：数据库备份
生产 PostgreSQL：
Automatic Backup
+
PITR（条件允许）
并定期进行：
Restore Drill
有备份但没验证恢复：
不视为真正完成灾备。

第五十五章：CI
Pull Request：
Install
↓
Lint
↓
TypeCheck
↓
Unit
↓
PostgreSQL Integration
↓
Build

第五十六章：CD
main
↓
Build Immutable Image
↓
Staging
↓
Migration
↓
E2E
↓
Smoke Test
↓
人工 Production Approval
↓
Production
↓
Health Check
V1 生产发布保留人工批准。

第五十七章：Migration
已经执行的 Migration：
永远不修改。
数据库变化通过新增 Migration。
优先采用向前兼容：
新增 nullable
↓
部署兼容代码
↓
数据迁移
↓
最后收紧约束
避免新代码/旧代码瞬间不兼容。

第五十八章：客户端版本兼容
由于微信审核存在时间差：
Backend 必须在一段窗口支持：
MiniProgram N
+
MiniProgram N-1
不能 Backend 一升级：
所有旧版商户小程序立即失效。

第五十九章：Feature Flag
新功能：
Backend deployed
不等于：
Merchant enabled
通过 FeatureFlag：
内部
↓
少量商户
↓
逐步放量
↓
全部

第六十章：测试体系
Unit
↓
PostgreSQL Integration
↓
API Integration
↓
E2E
↓
Transaction Safety
↓
Worker Recovery
↓
Security/Tenant
↓
Staging
↓
Business Acceptance
↓
Money Safety Gate

第六十一章：P0 Money Safety Gate
真钱上线前必须验证：
不超卖
金额服务端计算
订单创建事务
支付幂等
回调验签
重复回调
金额核对
重复真实付款
Payment SUCCESS不可逆
发券补偿
N份=N券
Refund额度安全
Refund幂等
Refund/Redemption互斥
一券一核销
FeeReversal幂等
Tenant隔离
Consumer Owner隔离
Staff停用即时生效
Secret不泄露
Outbox恢复
Payment/Refund确认补偿
对账发现异常
数据库恢复
HTTPS
环境隔离
任何 P0 Failure：
禁止开放真实资金交易。

第六十二章：V1 明确不做过度架构
V1 不引入：
Microservices
Kubernetes
Kafka
复杂分布式事务
Event Sourcing
Service Mesh
当前：
模块化单体
+
PostgreSQL
+
Redis
+
Worker
+
Outbox
已经满足第一版真实商用需求。

第六十三章：架构核心原则汇总
整个系统后续开发必须始终遵守：
业务规则先于代码

Domain不依赖技术框架

数据库负责最后一道一致性保护

外部支付结果不直接污染Domain

支付事实与订单状态分离

退款事实与Voucher状态分离

跨领域通过明确Contract/Event协作

所有外部调用考虑重复、超时、乱序

所有Worker必须幂等

所有核心资金动作必须可追踪

所有Tenant必须严格隔离

Redis不能成为交易真相

微信小程序是统一模板，不是复制工程

小程序配置和SaaS业务数据分离

API与Worker共享业务逻辑

生产与测试环境严格隔离

测试通过Money Safety Gate才允许真钱上线
以上为：
SaaS V1 Architecture Baseline V1.0。

第六十四章：Identity / Session / Tenant Context 补充架构

ARCH-IDENTITY-001｜身份链路
正式身份链路为 External Auth Provider → Identity → Actor → AuthSession。Domain 不写死
微信或其他 Provider；DEV-P0-006 可使用 Authentication Provider Port 和 Test Adapter，
不得接入未经批准的第三方 Auth SaaS。状态：V1 LOCKED

ARCH-AUTH-001｜Opaque Session
AuthSession 持久化 token hash，不持久化 raw token。请求认证必须检查 Session 状态、
有效期、Actor 当前状态及 permission_version。Staff 与 PlatformAdmin 使用相同的失效
原则但保持独立 Actor 类型。状态：V1 LOCKED

ARCH-TENANT-001｜可信 Tenant 解析
Staff TenantContext 只能由 AuthSession → Staff → staff.merchant_id 推导。PlatformAdmin
先建立 PlatformContext；跨 Tenant 操作必须经过 Platform Permission，并以明确的 target
merchant 建立 TargetTenantContext。Merchant Actor 不得使用该入口。状态：V1 LOCKED

ARCH-STORE-001｜门店 Scope
Staff StoreScope 来自 ACTIVE StaffStoreAssignment 集合；primary_store_id 仅为默认门店。
状态：V1 LOCKED

ARCH-RBAC-001｜数据驱动权限
初始角色代码为 PLATFORM_SUPER_ADMIN、PLATFORM_REVIEWER、MERCHANT_ADMIN、
MERCHANT_STAFF。权限通过 Role → RolePermission → Permission 解析，不建立散落的
role-code 条件授权。状态：V1 LOCKED

第六十五章：Merchant Lifecycle 与 Platform Management Permission

ARCH-MERCHANT-001｜生命周期策略
Merchant 生命周期使用集中、框架无关的状态转换策略。Controller 不得接受任意 status
PATCH；Application Service 只能调用 activate、suspend、freeze、restore、terminate 等
明确动作。正式状态为 PENDING_SETUP、ACTIVE、SUSPENDED、FROZEN、TERMINATED，转换
矩阵以 BR-MERCHANT-001A 为准。状态：V1 LOCKED

ARCH-RBAC-002｜Platform 管理权限
正式 Platform Permission Registry 包含 merchant.view、merchant.create、
merchant.lifecycle.manage、brand.view、brand.manage、store.view、store.manage、
merchant_capability.view、merchant_capability.manage。PLATFORM_SUPER_ADMIN 通过集中式
Registry 获得全部已注册 Platform 权限；PLATFORM_REVIEWER 仅增加 brand.view 和
store.view，不得获得管理权限。Merchant 角色不得获得 Platform Management Permission。
状态：V1 LOCKED
