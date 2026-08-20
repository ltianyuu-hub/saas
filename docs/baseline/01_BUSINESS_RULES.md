SaaS V1 业务规则基线源稿》
Baseline Version：V1.0
Document Type：SaaS V1 Development Baseline
状态：V1 LOCKED
本文件是 SaaS V1 开发业务基线。后续数据库、API、前端、小程序、支付、退款、核销及平台后台开发，均必须遵守本文件。未经商业决策确认，不得擅自改变标记为 V1 LOCKED 的业务规则。

第一章：产品定位
BR-SCOPE-001｜产品性质
本系统是一个面向本地商家的团购 SaaS 平台。
平台负责提供统一的软件能力，包括：
平台
├─ 商户管理
├─ 商品管理
├─ 团购管理
├─ 库存
├─ 订单
├─ 微信支付
├─ 团购券
├─ 核销
├─ 退款
├─ 员工
├─ 平台审核
├─ 服务费
├─ 风险与异常
├─ 小程序配置
└─ 微信小程序代开发/发布能力
每个商户最终拥有自己的消费者微信小程序，但底层不是每个商户开发一套独立代码。
采用：
统一小程序模板 + 商户配置 + SaaS Backend。
状态：V1 LOCKED

第二章：平台、商户、品牌与门店
BR-MERCHANT-001｜Merchant 是租户根
每一个商户 Merchant 是 SaaS 的主要租户边界。
商户 A 的：
商品
团购
库存
订单
支付
退款
券
员工
门店
配置
不得被商户 B 访问。

BR-MERCHANT-002｜品牌归属于商户
V1 中：
Merchant
↓
Brand
↓
Store
品牌和门店都必须明确属于 Merchant。
所有核心业务数据必须能够追溯到 Merchant。

BR-STORE-001｜门店
门店是：
团购适用范围
员工工作范围
核销范围
的重要业务实体。
团购必须明确可使用门店范围。
员工核销时必须校验其 Store Scope。

第三章：商户生命周期
商户生命周期至少区分：
PENDING_SETUP
ACTIVE
SUSPENDED
FROZEN
TERMINATED
平台拥有控制商户经营能力的最终权限。

BR-MERCHANT-001A｜正式状态转换矩阵
创建 Merchant 后状态为 PENDING_SETUP。允许转换：PENDING_SETUP → ACTIVE；ACTIVE →
SUSPENDED；ACTIVE → FROZEN；SUSPENDED → FROZEN；SUSPENDED → ACTIVE；FROZEN →
ACTIVE；PENDING_SETUP、SUSPENDED 或 FROZEN → TERMINATED。禁止 ACTIVE 直接进入
TERMINATED；ACTIVE 必须先暂停或冻结。TERMINATED 是终态，不得恢复到任何其他状态。
状态：V1 LOCKED

BR-MERCHANT-001B｜状态与经营能力分离
SUSPENDED 表示常规经营暂停，FROZEN 表示更强的平台风险/治理冻结。两者原则上阻止新的
经营交易，但历史数据和受控履约/退款能力继续保留。MerchantStatus 不替代
MerchantCapability；TERMINATED 禁止新的经营行为且不得物理删除历史。
状态：V1 LOCKED

BR-MERCHANT-003｜冻结
Merchant FROZEN 后：
原则上禁止产生新的经营交易，例如：
创建新团购
新支付
新的消费者购买
但不能破坏：
历史订单
历史支付
历史退款
历史团购券
审计记录
冻结不是删除。

BR-MERCHANT-004｜清退
商户清退必须经过受控流程。
不得：
DELETE merchant
直接删除商户历史。
清退需要考虑：
未完成订单
未退款资金
未使用券
已核销券
支付账户
小程序授权
平台费用
完成后进入：
TERMINATED
历史数据继续保留。

第四章：员工与权限
BR-STAFF-001
商户可以创建员工。
员工至少拥有：
ACTIVE
SUSPENDED
DISABLED
等状态。
员工权限根据：
角色
权限集合
门店 Scope
确定。

BR-STAFF-002｜员工停用即时生效
如果员工：
ACTIVE → SUSPENDED
即使旧 Access Token 尚未过期，也不得继续：
核销
退款审批
敏感后台操作
系统需要使用权限版本/状态校验机制实现。
状态：V1 LOCKED

第五章：消费者
消费者身份与商户员工身份独立。
消费者只能访问：
自己的订单
自己的支付结果
自己的退款
自己的团购券
消费者 A 不得通过修改 ID 访问消费者 B 的资源。

第六章：商品
Product 是商户长期维护的商品基础资料。
商品本身不等于团购活动。
例如：
Product
“海鲜双人套餐”

Campaign
“99元限时双人套餐”
二者分离。

第七章：团购 Campaign
团购是消费者真正购买的销售活动。
Campaign 包含：
销售价格
活动时间
库存
限购
适用门店
券有效期规则
退款规则
展示信息
状态

BR-CAMPAIGN-001｜审核后版本不可静默篡改
涉及消费者交易含义的重要信息一旦审核/销售：
价格
商品内容
有效期
退款规则
适用门店
不得直接覆盖历史版本。
需要通过版本化方式处理。
这样历史 OrderItem 必须能够知道：
用户购买时看到的到底是什么。

第八章：库存
库存必须是服务端控制。
消费者不能决定库存。
核心关系：
total_stock
reserved_stock
sold_stock
必须满足：
reserved_stock + sold_stock <= total_stock

BR-INVENTORY-001｜下单锁库存
消费者创建有效待支付订单：
available stock
↓
Reservation ACTIVE
↓
reserved_stock + quantity
支付成功：
Reservation CONSUMED
reserved_stock - quantity
sold_stock + quantity
订单明确关闭：
Reservation RELEASED
reserved_stock - quantity

BR-INVENTORY-002｜禁止超卖
多个消费者并发购买最后库存时：
只能有满足剩余库存数量的请求成功。
必须由数据库原子条件更新/行锁保障。

第九章：限购
Campaign 可以设置消费者购买数量上限。
限购必须服务端判断。
例如：
limit = 5
已经占用/购买 = 4
再次购买 2
→ 拒绝

BR-LIMIT-001｜退款后的额度
普通、未核销券退款成功：
对应购买额度可以恢复。
已经核销的券，即使后续发生特殊退款：
不恢复原限购额度。
状态：V1 LOCKED

第十章：订单
BR-ORDER-001｜V1 商品模型
已经正式确定：
一个订单只购买一种团购商品，但允许购买 N 份。
例如：
Campaign A
quantity = 3
允许。
但 V1 不做：
Campaign A × 2
+
Campaign B × 1
一个订单多商品购物车。
状态：V1 LOCKED

BR-ORDER-002｜金额由服务器计算
消费者只允许提交：
campaign_id
quantity
等业务参数。
不得相信前端：
price
payable_amount
discount_amount
最终金额由服务器根据有效 CampaignVersion 计算。

BR-ORDER-003｜订单快照
OrderItem 必须保留购买时：
商品
版本
价格
数量
关键交易信息
后续商户修改 Product/Campaign 不得改变历史订单含义。

第十一章：订单状态
订单至少需要表达：
PENDING_PAYMENT
PAYMENT_CONFIRMING
PAID
FULFILLING
FULFILLED
CLOSED
PARTIALLY_REFUNDED
REFUNDED
具体实现允许进一步细化，但不得破坏状态含义。

BR-ORDER-004｜超时不能盲关订单
达到支付截止时间：
不能只因为：
payment_deadline_at < now
就释放库存。
必须检查 Payment。
如果支付明确失败/未发生：
CLOSED
Reservation RELEASED
如果支付状态未知：
PAYMENT_CONFIRMING
主动向支付 Provider 查单。

第十二章：支付
Payment 与 Order 分离。
一个 Order 可能产生多个 Payment Attempt。

BR-PAYMENT-001｜Payment SUCCESS 是外部资金事实
一旦微信确认某 Payment 真实支付成功：
Payment = SUCCESS
这个资金事实不能因为：
订单后来退款
订单关闭
商户冻结
被改回 FAILED。

BR-PAYMENT-002｜一个订单只能有一个有效成功支付
如果同一订单意外发生两笔真实成功付款：
第一笔：
SUCCESS
effective_for_order = true
第二笔：
SUCCESS
effective_for_order = false
第二笔仍然是真实支付事实，但不能：
再次发券
再次扣库存
再次计算正常成交服务费
必须进入：
DUPLICATE_PAYMENT
异常处理。

BR-PAYMENT-003｜金额必须一致
微信实际支付金额必须满足：
provider amount
=
Payment amount
=
Order payable amount
不一致不得正常履约。
进入：
PAYMENT_MISMATCH

BR-PAYMENT-004｜支付状态未知
如果创建支付或确认支付时网络超时：
不能简单：
Payment → FAILED
如果无法判断微信是否已经处理：
Payment → CONFIRMING
通过主动查单确认。

BR-PAYMENT-005｜支付回调幂等
微信重复发送同一个成功通知：
业务只能生效一次。
不能重复：
发券
扣库存
服务费
订单推进

第十三章：团购券
BR-VOUCHER-001｜N份=N张券
这是 V1 核心规则：
购买 N 份团购商品，生成 N 张独立 Voucher。
例如：
quantity = 3
必须：
Voucher #1
Voucher #2
Voucher #3
而不是：
一张券 quantity=3
状态：V1 LOCKED

BR-VOUCHER-002｜券独立生命周期
每张券可以独立：
使用
退款
过期
核销
因此购买三份后可以：
券1 已核销
券2 未使用
券3 退款

第十四章：Voucher 状态
核心状态至少：
UNUSED
REFUNDING
REDEEMED
EXPIRED
REFUNDED
必要时可以增加系统处理中间状态。

BR-VOUCHER-003｜发券补偿
Payment 成功后，如果购买 3 份：
预期：
expected_quantity = 3
系统只生成 1 张后崩溃。
恢复时：
只补第 2、3 张。
不得重新生成 1、2、3。
Voucher sequence 必须唯一。

第十五章：核销
核销采用：
Preview
↓
Confirm
两阶段。

BR-REDEEM-001｜Preview
Preview 只告诉员工：
券是否存在
商品
状态
适用门店
消费者必要信息
是否当前可核销
Preview：
不产生核销事实。

BR-REDEEM-002｜Confirm 必须重新验证
即使 Preview 一分钟前显示可用：
Confirm 时仍然必须重新检查：
Voucher状态
门店
员工权限
Merchant状态
Campaign规则
不能信任旧 Preview。

BR-REDEEM-003｜一券只能成功核销一次
多个员工同时确认同一 Voucher：
只能一个 Redemption 成功。

BR-REDEEM-004｜门店限制
Voucher 只能在 Campaign 允许的门店核销。
员工也必须拥有对应 Store Scope。

第十六章：退款与核销互斥
这是整个交易系统最高级别规则之一。
普通未履约 Voucher：
UNUSED
退款操作需要原子抢占：
UNUSED → REFUNDING
核销需要：
UNUSED → REDEEMED
因此并发时：
只有一个状态变化可以成功。
绝不能：
Refund SUCCESS
+
Redemption SUCCESS
同时发生在普通券上。
状态：V1 LOCKED

第十七章：误核销撤销
不能删除 Redemption。
如果员工误操作：
Redemption SUCCESS
需要建立：
RedemptionReversal
流程。
例如：
REQUESTED
APPROVED
COMPLETED
完成后 Voucher 可以根据规则恢复。
但原核销记录永久保留。

第十八章：退款
Refund 是独立业务实体。
退款不能简单：
Order.status = refunded
代替。
必须能够记录：
退款原因
退款金额
退款券
审批
微信退款号
Provider状态
时间
操作人

BR-REFUND-001｜支持部分退款
因为：
1订单
→ N份
→ N张Voucher
所以允许只退款其中未履约券。

BR-REFUND-002｜退款金额上限
同一 Payment：
累计成功退款
+
当前退款额度占用
不得超过：
Payment amount
并发 Refund 也必须保证。

BR-REFUND-003｜退款处理中锁券
退款进入有效处理：
Voucher
UNUSED/允许退款状态
→ REFUNDING
防止同时核销。

BR-REFUND-004｜退款状态未知
调用微信退款接口发生 Timeout：
不能直接重新创建退款。
先：
Refund CONFIRMING
↓
queryRefund()
确认微信实际状态。

BR-REFUND-005｜退款失败恢复券状态
如果退款明确最终失败：
Voucher 从 REFUNDING 恢复：
voucher_status_before_refund
例如原来 UNUSED：
→ UNUSED
原来 EXPIRED：
→ EXPIRED
不能全部恢复 UNUSED。

第十九章：退款后的库存
普通未核销 Voucher 成功退款：
根据销售规则恢复相应库存。
已经核销后的特殊退款：
不恢复库存。
清退等特殊 Refund：
根据 Refund Type 决定，不机械恢复库存。
因此必须存在：
InventoryRestorePolicy

第二十章：服务费 / 平台佣金
平台可以针对有效成交收取服务费。
FeeRecord 必须对应：
有效成功 Payment
而不是订单创建。

BR-FEE-001
只有：
Payment SUCCESS
effective_for_order = true
才生成正常成交 FeeRecord。
重复真实付款不重复产生正常成交费。

BR-FEE-002
退款成功需要根据费用规则生成：
FeeReversal
而不是修改/删除原 FeeRecord。
这样能够保留完整账务历史。

第二十一章：审核
平台可以对：
Merchant
Product
Campaign
关键经营资料
进行审核。
审核结果必须留痕。
涉及交易含义的 Campaign 修改需要版本化和必要的重新审核。

第二十二章：风险
Risk 模块可以：
识别风险
阻断操作
要求人工复核
冻结能力
但 Risk 本身不直接篡改：
Payment
Voucher
Inventory
真实业务状态。

第二十三章：异常中心
重要异常必须进入 Exception Center。
包括但不限于：
DUPLICATE_PAYMENT
PAYMENT_MISMATCH
PAYMENT_CONFIRM_TIMEOUT
REFUND_CONFIRM_TIMEOUT
VOUCHER_COUNT_MISMATCH
VOUCHER_OVER_ISSUED
INVENTORY_MISMATCH
INVENTORY_RESERVATION_LEAK
异常不得只存在日志。

第二十四章：对账
系统必须周期性检查：
Payment ↔ Order
Order ↔ Voucher
Refund ↔ Voucher
Voucher ↔ Redemption
Inventory ↔ Order/Reservation
对账发现异常：
默认产生 Mismatch/Exception。
不要自动静默修改核心资金数据。

第二十五章：审计
以下操作必须留下 Audit：
商户冻结
商户清退
退款审批
核销撤销
库存人工调整
员工权限变化
平台费率变化
支付账户配置变化
小程序授权/解绑
风险处置
审计记录原则上不可业务删除。

第二十六章：小程序业务模式
每个商户最终拥有自己的小程序主体/AppID。
但技术实现采用：
统一代码模板
+
商户独立 AppID
+
商户独立配置
+
统一 SaaS Backend
不是：
商户A代码
商户B代码
商户C代码
长期复制。
状态：V1 LOCKED

第二十七章：小程序 Bootstrap
小程序启动：
微信运行上下文
↓
识别当前 AppID / 第三方配置
↓
SaaS Bootstrap
↓
确定 Merchant
↓
读取 ConfigVersion
↓
品牌配置
↓
FeatureFlag
↓
业务数据
消费者不能自己提交：
merchant_id = A
然后访问 A。
租户身份必须由可信小程序上下文决定。

第二十八章：微信开放平台
系统作为第三方平台服务商。
商户通过微信官方授权流程：
商户管理员扫码
↓
选择小程序
↓
授权第三方平台
↓
平台获得授权凭证
↓
建立 MiniProgramAuthorization
授权撤销：
Authorization → REVOKED
不能删除历史交易。

第二十九章：统一模板发布
统一模板发布流程概念上：
开发代码
↓
第三方平台草稿
↓
加入模板库
↓
获得 template_id
↓
为授权小程序上传代码
↓
生成体验版
↓
提交审核
↓
查询审核状态
↓
审核成功
↓
发布
每个商户使用：
同一个模板版本
+
自己的 ext/config
实现差异化。

第三十章：支付账户
商户支付能力必须通过受控 PaymentAccount 配置。
支付账户：
ACTIVE
DISABLED
ERROR
等状态必须影响是否允许创建新支付。
敏感支付 Credential 不允许返回前端。

第三十一章：多租户业务规则
所有商户核心资源必须具备 Tenant Boundary。
访问：
Merchant A
→ Merchant B Order
统一表现为：
NOT_FOUND
避免泄露 B 的资源存在。

第三十二章：V1 明确不采用的模式
V1 不做：
微服务
Kubernetes
复杂事件总线
每商户独立代码仓库
每商户独立 SaaS 后端
Redis作为交易真相源
前端决定价格
Controller直接操作交易数据库
订单直接代表支付
删除历史核销
删除历史支付

第三十三章：V1 核心不可破坏规则
开发过程中以下规则视为 Money Safety Rules：
① 不超卖
② 前端不能决定金额
③ Payment SUCCESS 是真实资金事实
④ 一个订单只能一个 effective success payment
⑤ 重复支付回调不能重复履约
⑥ 买 N 份必须 N 张独立 Voucher
⑦ Voucher 退款与核销原子互斥
⑧ 一张 Voucher 只能成功核销一次
⑨ Refund 总额不得超过 Payment
⑩ Refund UNKNOWN 不得盲重试
⑪ Payment UNKNOWN 不得盲关订单
⑫ 商户之间严格数据隔离
⑬ Redis不是交易真相源
⑭ 核心交易变化必须可审计
⑮ 外部失败必须可补偿/对账
以上全部：
V1 LOCKED。

第三十四章：Identity / Tenant / RBAC 基础补充

BR-STAFF-003｜员工多门店 Scope
一个 Staff 可以关联多个 Store。`staff.primary_store_id` 只表示默认/主要门店，
实际权限范围来自状态为 ACTIVE 的 StaffStoreAssignment。跨 Merchant 的员工与门店
关联必须被数据库租户复合约束拒绝。
状态：V1 LOCKED

BR-IDENTITY-001｜平台身份独立
PlatformAdmin 是 SaaS 平台身份，不是 Merchant Staff，不属于任何 Merchant。
PlatformAdmin 通过独立的 PlatformAdminIdentity 绑定外部认证身份。
状态：V1 LOCKED

BR-AUTH-001｜服务端 Opaque Session
V1 Staff、Platform 和 Consumer Session 使用服务端持久化 opaque token。Token 至少
具有 256-bit 随机熵；客户端持有 raw token，数据库只保存 SHA-256 token hash，禁止
保存 raw token。Session 状态为 ACTIVE、REVOKED 或 EXPIRED，注销通过撤销而不是删除。
状态：V1 LOCKED

BR-AUTH-002｜权限即时失效
敏感请求必须重新校验 Actor 当前状态和 permission_version。Session 的
permission_version_snapshot 与 Actor 当前 permission_version 不一致时不得继续授权。
角色变化、权限敏感变化、停用或禁用必须推进 permission_version，使旧 Session 失效。
状态：V1 LOCKED

BR-RBAC-001｜初始系统角色
首版系统角色为 PLATFORM_SUPER_ADMIN、PLATFORM_REVIEWER、MERCHANT_ADMIN、
MERCHANT_STAFF。角色与权限继续通过 Role、Permission、RolePermission 数据驱动，
业务代码不得以散落的角色字符串判断代替权限检查。
状态：V1 LOCKED
