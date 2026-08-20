SaaS V1 测试与上线验收清单》
Baseline Version：V1.0

1. 测试层级
L1 Unit
L2 PostgreSQL Integration
L3 API Integration
L4 E2E
L5 Worker Recovery
L6 Security / Tenant
L7 Staging
L8 Business Acceptance
L9 Production Readiness

2. 优先级
P0
资金 / 安全 / Tenant / 可靠性
任何 P0 Failure：
禁止真钱上线。
P1
完整商用能力
关键 P1 Failure：
原则上禁止发布正式 V1。
P2
体验优化
可以后续修正。

3. Order P0
T-ORDER-001
同一 Idempotency Key 重复创建 Order：
只能生成1个Order
只能锁1份对应库存
T-ORDER-002
Order + OrderItem + InventoryReservation：
必须同事务。
任一步失败：
全部回滚
T-ORDER-003
前端恶意修改：
price
payable_amount
merchant_id
consumer_id
不得影响服务端真实订单。

4. Inventory P0
T-INV-001
库存：
total = 1
两人同时购买。
最终最多一个订单成功。
重复测试不得超卖。

T-INV-002
人工减少库存：
不得导致：
new_total < sold + reserved

T-INV-003
Refund 恢复库存：
普通未核销券按照规则恢复。
已核销特殊退款：
不恢复。

5. Payment P0
T-PAY-001
正常支付：
PENDING
→ SUCCESS
→ Order PAID
→ Fulfillment

T-PAY-002
重复微信支付 Callback 10 次：
最终只有：
1个有效支付
1套发券
1套Fee

T-PAY-003
主动查单先成功，Callback 后到。
结果幂等。

T-PAY-004
Callback 先成功，主动查单后到。
结果幂等。

T-PAY-005
微信金额：
Provider amount != Payment amount
不得履约。
产生：
PAYMENT_MISMATCH

T-PAY-006
同一 Order 两笔真实成功 Payment：
第一笔：
effective=true
第二笔：
SUCCESS
effective=false
DUPLICATE_PAYMENT
不得重复发券。

T-PAY-007
Payment SUCCESS：
不得因为 Refund 改成 FAILED。

6. Payment Timeout P0
T-PAY-TIMEOUT-001
创建支付网络超时但状态未知：
CONFIRMING
不得直接 FAILED。

T-PAY-TIMEOUT-002
Order 到期瞬间用户完成支付：
OrderTimeoutWorker 必须先确认 Provider 状态。
不得盲目释放库存。

7. Outbox P0
T-OUTBOX-001
Payment SUCCESS + Outbox COMMIT 后服务器立即宕机。
重启：
Worker 必须最终继续履约。

T-OUTBOX-002
同一 Outbox Event 被重复处理：
结果幂等。

8. Fulfillment P0
T-FUL-001
quantity 1 → 1券
quantity 2 → 2券
quantity 10 → 10券

T-FUL-002
购买3份：
系统只生成券 #1 后宕机。
恢复：
只补 #2 #3

T-FUL-003
重复执行 Fulfillment：
Voucher 数量永远不能 > quantity。

9. Voucher P0
T-VOUCHER-001
同一：
(order_item_id, sequence)
不能生成两张券。

T-VOUCHER-002
过期：
UNUSED → EXPIRED
不得自动等同退款。

10. Redemption P0
T-RED-001
两个 Staff 同时核销同一 Voucher。
只能：
1个SUCCESS

T-RED-002
Preview 显示可用。
Preview 后消费者申请 Refund。
Confirm 时：
必须重新校验并失败。

T-RED-003
Wrong Store：
VOUCHER_WRONG_STORE
Voucher 继续 UNUSED。

T-RED-004
Staff Suspend 后旧 Token/Session继续核销：
必须失败。

11. Refund × Redeem P0
T-RACE-001
Voucher：
UNUSED
线程 A：
Refund
线程 B：
Redeem
并发。
最终只能：
REFUNDING
或者：
REDEEMED
普通业务不得：
Refund SUCCESS
+
Redemption SUCCESS
同时成立。

12. Refund P0
T-REF-001
同一 Idempotency Key：
5 次 CreateRefund。
只能一个 Refund。

T-REF-002
Payment ¥297：
同时：
Refund A ¥198
Refund B ¥198
不得最终占用/退款 ¥396。

T-REF-003
退款回调重复 10 次：
FeeReversal一次
InventoryRestore一次
Voucher状态只推进一次

T-REF-004
createRefund Timeout：
状态 UNKNOWN。
系统：
CONFIRMING
→ queryRefund
不得立即重新 createRefund。

T-REF-005
Refund 最终明确失败。
原 Voucher：
UNUSED
恢复 UNUSED。
原 Voucher：
EXPIRED
恢复 EXPIRED。

13. Fee P0
T-FEE-001
只有：
Payment SUCCESS
effective=true
产生 FeeRecord。

T-FEE-002
重复 PaymentSucceeded：
不重复 FeeRecord。

T-FEE-003
RefundSucceeded 重复：
不重复 FeeReversal。

14. Tenant P0
T-TENANT-001
Merchant A Staff：
访问 Merchant B Order。
返回：
NOT_FOUND
不得泄露资源存在。

T-TENANT-002
跨 Tenant 测试：
Order
Voucher
Refund
Campaign
Store
Staff
全部必须拦截。

T-TENANT-003
数据库 Composite FK：
不得插入跨 Merchant 错关系。

15. Consumer Owner P0
Consumer A：
不得访问 Consumer B：
Order
Voucher
Refund

16. Callback Security P0
T-CALLBACK-001
伪造签名：
REJECTED
Payment/Refund 不变化。

T-CALLBACK-002
Callback 内容被修改：
必须拒绝。

17. Secret P0
扫描：
Git
Frontend Bundle
API Response
Application Log
Error Response
Docker Image
不得出现：
AppSecret
API v3 Key
PrivateKey
authorizer_access_token
DB password

18. Log Redaction P0
Token / Secret：
[REDACTED]
不得原文输出。

19. Worker Recovery P0
在下列阶段 Kill Worker：
Outbox Processing
Payment Confirm
Refund Confirm
Voucher Issue
ReleaseJob
重启：
最终必须恢复、可重试或进入 ManualReview。
不得制造重复资金事实。

20. Reconciliation P0
人为制造：
Payment SUCCESS
Order PENDING
运行 Reconciliation。
必须：
Mismatch
+
Exception
不得静默 UPDATE。

21. Backup P0
必须至少成功完成一次：
Backup
↓
Restore到新PostgreSQL
↓
启动系统
↓
核对关键数据
核对：
Merchant
Order
Payment
Refund
Voucher
Redemption
Audit

22. Environment P0
必须确保：
Staging DB != Production DB
Staging Redis != Production Redis
Staging Secrets != Production Secrets
正式小程序：
不允许连接 Staging。

23. HTTPS P0
生产：
Consumer
Merchant Web
Platform Web
Payment Callback
OpenPlatform Callback
全部 HTTPS。

24. MiniProgram P1
验证：
AppID → Correct Merchant
Merchant A：
不得加载 Merchant B Config。

25. MiniProgram Authorization P1
授权：
ACTIVE
撤销：
REVOKED
IntegrationHealth 更新。
历史订单不受影响。

26. ReleaseJob P1
测试：
commit
submitAudit
queryAudit
release
每一步：
成功
失败
重试
恢复

27. Product/Campaign P1
验证：
创建Product
新Version
Campaign
CampaignVersion
UsageRule
StoreScope
PurchaseLimit
提交Review
Review Approve
上线
暂停
恢复
历史 Version 不被新编辑覆盖。

28. Inventory Admin P1
验证：
追加库存
立即生效
减少库存合法校验
Adjustment记录
Audit

29. Refund Admin P1
验证：
Merchant Approve
Merchant Reject
Platform Exception Approve
Approve：
不代表 Provider SUCCESS。

30. Staff P1
验证：
新增
绑定
角色
停用
离职
历史 Redemption/Audit 保留。

31. Export P1
订单 Excel：
过滤正确
Tenant正确
row_count正确
下载URL短期有效

32. Audit P1
以下操作必须生成 Audit：
Inventory Adjustment
Refund Approval
Merchant Freeze
Merchant Restore
FeePolicy Change
Staff Role Change
Redemption Reversal
PaymentAccount Change
MiniProgram Configuration

33. Performance P1
V1 不要求超大规模，但必须完成合理压力测试。
至少关注：
API P95
DB Connection
Worker backlog
Payment Callback burst
Redeem burst
Order concurrency

34. Business Acceptance
建立真实角色：
Consumer
Merchant Staff
Merchant Manager
Platform Reviewer
Platform Super Admin
完整执行：
平台创建Merchant
↓
Brand / Store
↓
MiniProgram
↓
PaymentAccount
↓
Merchant建商品
↓
建Campaign
↓
平台审核
↓
消费者浏览
↓
下单
↓
微信支付
↓
发N张券
↓
核销其中一张
↓
退款另一张
↓
Merchant后台查询
↓
Platform查看Audit
↓
Reconciliation
必须 PASS。

35. Production Readiness Checklist
生产发布前确认：
P0全部PASS
关键P1 PASS
Staging PASS
Migration Review PASS
Backup PASS
Restore Drill PASS
HTTPS PASS
Secret Scan PASS
Callback公网可达
Provider Credential正确
Production FeatureFlags确认
Release Version确认
Rollback方案确认

36. Release Report
每个 Production Release 保存：
version
git_commit
migration_version
P0_result
P1_result
known_issues
staging_result
approved_by
released_at

37. Money Safety Gate
以下任何一项失败：
不超卖
金额服务端计算
支付幂等
支付回调验签
重复支付回调
重复真实支付
退款额度
退款幂等
退款核销互斥
一券一核销
N份=N券
Outbox恢复
Tenant隔离
Secrets
备份恢复
统一：
NO GO
不得开启真实生产资金交易。

38. Identity / Tenant / RBAC P0

T-IDENTITY-001
Staff 必须支持一个或多个 ACTIVE Store Assignment；重复 assignment 和跨 Tenant
assignment 必须由数据库拒绝。

T-IDENTITY-002
PlatformAdmin 不属于 Merchant；PlatformAdminIdentity 的 Provider Subject 必须唯一。

T-AUTH-001
AuthSession 必须仅保存 token hash，不得存在 raw token 字段；token hash 必须唯一。

T-AUTH-002
CONSUMER、STAFF、PLATFORM Session 必须分别且只能引用对应的一种 Actor；非法组合必须由
数据库 CHECK 拒绝。

T-AUTH-003
Session 过期、撤销、Actor 非 ACTIVE 或 permission_version 不匹配时必须拒绝授权。

T-RBAC-001
初始 Platform/Merchant 角色与 Permission Mapping 必须数据驱动；无权限 Role 必须被拒绝。

T-TENANT-004
Staff Tenant 必须从当前 Session 和 Staff 推导。只有获授权 PlatformActor 可以建立明确的
TargetTenantContext。Merchant Actor 不得通过客户端 merchant_id 或已知跨 Tenant ID 越权。

以上均为 P0，状态：V1 LOCKED

39. Merchant Lifecycle / Platform Management RBAC P0

T-MERCHANT-LIFECYCLE-001
必须验证 BR-MERCHANT-001A 的全部允许转换，以及 ACTIVE→TERMINATED 和所有
TERMINATED→其他状态均被拒绝。

T-PLATFORM-RBAC-001
PLATFORM_SUPER_ADMIN 必须拥有全部已注册 Platform Management Permission。
PLATFORM_REVIEWER 必须拥有 merchant.view、brand.view、store.view，但不得拥有
merchant.lifecycle.manage 或 merchant_capability.manage。

T-PLATFORM-RBAC-002
MERCHANT_ADMIN 与 MERCHANT_STAFF 不得获得 merchant.create、merchant.lifecycle.manage、
brand.manage、store.manage 或 merchant_capability.manage，也不得自行提升权限。

现有 Identity、Tenant、RBAC 和 PostgreSQL 约束测试必须继续通过。
以上均为 P0，状态：V1 LOCKED
