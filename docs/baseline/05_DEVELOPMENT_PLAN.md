SaaS V1 开发实施计划》
Baseline Version：V1.0
状态：V1 LOCKED
目标：
将已经完成的业务、数据库、API和架构设计转换成实际可执行开发顺序。
原则：
每个 Phase 必须完成“代码 + 测试 + 执行报告”，通过验收后才进入下一阶段。

Phase 0｜项目工程初始化
目标：
建立可以稳定开发、测试、构建的 Monorepo。
任务：
0.1 检查 Node / pnpm / Docker / Git
0.2 初始化 Git Repository
0.3 初始化 pnpm Workspace
0.4 建立 apps/
0.5 建立 packages/
0.6 初始化 NestJS API
0.7 初始化 Worker
0.8 初始化 Merchant Web
0.9 初始化 Platform Web
0.10 初始化微信小程序模板
0.11 初始化 Prisma
0.12 Docker Compose PostgreSQL + Redis
0.13 ESLint / TypeScript / Formatter
0.14 Vitest/Jest
0.15 env.example
0.16 CI基础流程
验收：
pnpm install ✅
lint ✅
typecheck ✅
test ✅
build ✅
PostgreSQL reachable ✅
Redis reachable ✅

Phase 1｜项目文档与工程守则
创建：
AGENTS.md

docs/baseline/
01_BUSINESS_RULES.md
02_ARCHITECTURE.md
03_DATABASE_SPEC.md
04_API_SPEC.md
05_DEVELOPMENT_PLAN.md
06_TESTING_ACCEPTANCE.md
Codex 每次开发任务必须先阅读 AGENTS。

Phase 2｜数据库基础
实现：
Prisma Schema
Migration Framework
TransactionManager
TransactionContext
Database Health
先建立基础：
Merchant
Brand
Store
Role
Permission
Staff
Consumer
Identity
测试：
FK
Tenant FK
Unique
Check
Migration up

Phase 3｜Identity / Tenant / RBAC
实现：
ActorContext
TenantContext
RequestContext
CurrentConsumer
CurrentStaff
PlatformActor
PermissionGuard
TenantGuard
MerchantCapabilityGuard
必须首先实现 Tenant Isolation 测试。

Phase 4｜Merchant / Brand / Store
实现：
Merchant Application Service
Brand
Store
Capability
Platform Merchant API
Merchant Bootstrap
暂不接真实支付。

Phase 5｜MiniProgram Runtime 基础
实现：
MiniProgramAccount
Authorization model
MiniProgramConfig
FeatureFlag
Consumer Bootstrap
Fake MiniProgram Context
此阶段先实现 Fake Provider。

Phase 6｜Product
实现：
Product
ProductVersion
PackageItem
ProductMedia
功能：
创建
新版本
编辑Draft
查询

Phase 7｜Campaign
实现：
Campaign
CampaignVersion
UsageRule
CampaignStore
PurchaseLimitRule
功能：
创建
编辑
提交审核
暂停
恢复
此阶段先可使用简化 Review。

Phase 8｜Inventory
实现：
Inventory
Reservation
Adjustment
Atomic Reserve
Release
Consume
必须首先通过：
最后库存并发抢购测试。

Phase 9｜Order
实现：
CreateOrder
OrderItem Snapshot
Order Query
Order Cancel
Order Timeout基础
此阶段使用：
FakePaymentProvider

Phase 10｜Fake Payment
先不要立刻接微信真钱。
实现：
Payment
PaymentProvider Port
FakePaymentProvider
PaymentService.applyProviderResult
Callback Simulation
支持：
SUCCESS
FAILED
TIMEOUT
UNKNOWN
DUPLICATE_SUCCESS
通过核心支付测试后才能接微信。

Phase 11｜Outbox + Worker
实现：
EventOutbox
OutboxWorker
JobContext
Retry
Backoff
DeadLetter
先完成：
PaymentSucceeded
可靠传播。

Phase 12｜Fulfillment / Voucher
实现：
FulfillmentRecord
Voucher
VoucherIssueService
VoucherIssueCompensation
必须通过：
N份=N券
重复事件不多发
发到一半宕机恢复

Phase 13｜Redemption
实现：
RedeemToken
Preview
Confirm
Redemption
RedemptionReversal
必须通过：
一券一成功核销
错误门店
Staff停用
并发核销

Phase 14｜Refund
实现：
Refund
RefundItem
RefundReview
FakeProvider Refund
Refund Confirmation
必须通过：
退款额度
部分退款
并发退款
未知状态
失败状态恢复

Phase 15｜Refund × Redemption 并发
单独作为资金安全阶段。
必须验证：
同一Voucher
Refund vs Redeem
同时发生
永远只能一方成功。
此测试未通过：
禁止进入真实微信支付阶段。

Phase 16｜Fee
实现：
FeePolicy
FeeRecord
FeeReversal
支持：
Platform
Merchant
Brand
Scope。

Phase 17｜Governance
实现：
ReviewCase
RiskRule
RiskEvent
Exception
Compensation
Audit
SecurityEvent
V1 可先实现必要核心，再逐步增强 UI。

Phase 18｜Reconciliation
至少实现：
PAYMENT_ORDER
ORDER_VOUCHER
REFUND_VOUCHER
VOUCHER_REDEMPTION
INVENTORY_ORDER
必须做到：
发现异常，不静默篡改。

Phase 19｜微信支付接入
只有 Fake Payment 测试全部通过后进入。
实现：
WeChatPayProvider
createPayment
queryPayment
createRefund
queryRefund

Payment Callback
Refund Callback

签名/解密/验签
Provider Adapter 与 Domain 隔离。

Phase 20｜真实微信联调
使用受控测试商户。
验证：
小程序下单
调起微信支付
支付Callback
主动查单
发券
核销
退款
退款Callback
Fee
禁止直接以 Production 正式用户作为首测。

Phase 21｜微信开放平台
实现：
MiniProgramAuthorization
Authorization Event
SecretRef
Authorization Revoked
IntegrationHealth

Phase 22｜小程序模板发布
实现：
Template
ReleaseJob

commit
submitAudit
queryAudit
release
每一步可恢复。

Phase 23｜Consumer MiniApp
完整接入：
Bootstrap
Login
Campaign
Order
Payment
Orders
Voucher
Redeem Token
Refund
UI 优先满足商用，不追求复杂视觉。

Phase 24｜Merchant Web
实现：
Login
Product
Campaign
Inventory
Orders
Refund
Redemption
Staff
Stores
Export
Analytics

Phase 25｜Platform Web
实现：
Merchant
Brand
Store
MiniProgram
PaymentAccount
Review
FeePolicy
Risk
Exception
Reconciliation
Audit
Clearing

Phase 26｜Export
实现：
ExportJob
Excel
签名下载URL
订单 Excel 导出。

Phase 27｜Observability
实现：
Structured Logging
Request ID
Correlation ID
Error Tracking
Metrics
Worker Backlog
Business Alerts
Secret Redaction。

Phase 28｜Deployment
建立：
LOCAL
TEST
STAGING
PRODUCTION
配置：
Docker
Managed PostgreSQL
Redis
Object Storage
HTTPS
Secrets

Phase 29｜CI/CD
实现：
PR：
Lint
Typecheck
Unit
Integration
Build
Staging：
Migration
API E2E
Worker E2E
Smoke
Production：
Manual Approval
Deploy
Health Check

Phase 30｜Money Safety Gate
全部 P0 测试必须 PASS。
如果任意核心项失败：
NO GO

Phase 31｜Business Acceptance Test
真实角色走完整链：
创建商户
↓
门店
↓
小程序
↓
商品
↓
团购
↓
审核
↓
消费者购买
↓
微信支付
↓
发券
↓
核销
↓
部分退款
↓
后台查询
↓
对账

Phase 32｜Production Launch
上线前：
Backup
Migration Review
Release Notes
P0 Report
P1 Report
Staging PASS
Secrets Check
Callback Reachability
Database Restore Test
完成后再开放真实消费者。

开发任务执行模式
每一个任务均采用：
我/架构负责人
↓
明确 DEV-ID
↓
Codex读取AGENTS和相关Baseline
↓
只实现当前Task
↓
运行测试
↓
输出变更报告
↓
架构复核
↓
Commit
↓
下一Task

Codex 每次执行必须报告
1 修改了哪些文件
2 为什么修改
3 创建了哪些Migration
4 执行了哪些命令
5 哪些测试通过
6 哪些测试失败
7 是否修改V1 LOCKED规则
8 是否存在技术债
9 是否存在待确认商业决策
10 推荐Commit Message

Git 原则
建议：
main
feature/*
fix/*
每一个完成并验收的小任务至少有明确 Commit。
禁止几天写一大坨最后一次 Commit。

开发计划最高原则
DEV-001 不一次开发完整SaaS
DEV-002 一个Phase必须可测试
DEV-003 FakeProvider先于真实支付
DEV-004 核心资金测试先于UI美化
DEV-005 每阶段通过才能进入下一阶段
DEV-006 业务规则变化先修改Baseline，再改代码
DEV-007 Database Migration不可直接生产执行
DEV-008 Codex不得自行改变V1 LOCKED规则
全部：
V1 LOCKED

