-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'FROZEN', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "MiniProgramConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MiniProgramReleaseJobStatus" AS ENUM ('PENDING', 'COMMITTING', 'EXPERIENCE_READY', 'AUDIT_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RELEASING', 'RELEASED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GROUP_BUY');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'PAUSED', 'ENDED', 'TERMINATION_REQUESTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "UsageRuleType" AS ENUM ('FIXED_RANGE', 'AFTER_PURCHASE');

-- CreateEnum
CREATE TYPE "InventoryMode" AS ENUM ('LIMITED', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "InventoryScope" AS ENUM ('CAMPAIGN');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('MANUAL_INCREASE', 'MANUAL_DECREASE', 'SYSTEM_RESTORE', 'SYSTEM_CORRECTION');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('GROUP_BUY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_CONFIRMING', 'PAID', 'FULFILLING', 'FULFILLED', 'CLOSED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PROCESSING', 'CONFIRMING', 'SUCCESS', 'FAILED', 'CLOSED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('UNUSED', 'REDEEMING', 'REDEEMED', 'REFUNDING', 'REFUNDED', 'EXPIRED', 'VOID', 'REDEEM_REVERSAL_PENDING');

-- CreateEnum
CREATE TYPE "VoucherStatusBeforeRefund" AS ENUM ('UNUSED', 'EXPIRED', 'REDEEMED');

-- CreateEnum
CREATE TYPE "RedemptionMethod" AS ENUM ('QR', 'CODE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('NORMAL', 'EXPIRED_VOUCHER', 'DUPLICATE_PAYMENT', 'POST_REDEMPTION_EXCEPTION', 'MERCHANT_CLEARING');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'POLICY_CHECKING', 'MANUAL_REVIEW', 'APPROVED', 'PROCESSING', 'CONFIRMING', 'SUCCESS', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "RiskScene" AS ENUM ('PRE_ORDER', 'PRE_PAYMENT', 'POST_PAYMENT', 'REFUND', 'REDEMPTION', 'MERCHANT', 'REVIEW');

-- CreateEnum
CREATE TYPE "RiskAction" AS ENUM ('ALLOW', 'REVIEW', 'BLOCK', 'ESCALATE');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('PAYMENT_MISMATCH', 'DUPLICATE_PAYMENT', 'PAYMENT_CONFIRM_TIMEOUT', 'VOUCHER_ISSUE_FAILED', 'VOUCHER_COUNT_MISMATCH', 'VOUCHER_OVER_ISSUED', 'REFUND_CONFIRM_TIMEOUT', 'REFUND_STATE_MISMATCH', 'INVENTORY_MISMATCH', 'INVENTORY_RESERVATION_LEAK', 'REDEMPTION_STATE_MISMATCH', 'FEE_CALCULATION_ERROR', 'RECONCILIATION_ERROR');

-- CreateEnum
CREATE TYPE "ReconciliationType" AS ENUM ('PAYMENT_ORDER', 'REFUND_VOUCHER', 'ORDER_VOUCHER', 'INVENTORY_ORDER', 'FEE_SETTLEMENT');

-- CreateEnum
CREATE TYPE "IntegrationHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'ERROR');

-- CreateTable
CREATE TABLE "merchant" (
    "id" UUID NOT NULL,
    "merchant_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_entity_name" TEXT NOT NULL,
    "business_license_no" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "status" "MerchantStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_file_id" UUID,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "store_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "longitude" DECIMAL(10,7),
    "latitude" DECIMAL(10,7),
    "contact_phone" TEXT,
    "business_hours_json" JSONB,
    "status" "StoreStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "permission_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "role_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "primary_store_id" UUID,
    "role_id" UUID NOT NULL,
    "staff_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "StaffStatus" NOT NULL,
    "permission_version" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_identity" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "provider_subject_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identity" (
    "id" UUID NOT NULL,
    "consumer_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "provider_subject_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_consumer" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "consumer_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchant_consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_capability" (
    "merchant_id" UUID NOT NULL,
    "can_create_product" BOOLEAN NOT NULL DEFAULT false,
    "can_publish_product" BOOLEAN NOT NULL DEFAULT false,
    "can_accept_order" BOOLEAN NOT NULL DEFAULT false,
    "can_accept_payment" BOOLEAN NOT NULL DEFAULT false,
    "can_redeem_voucher" BOOLEAN NOT NULL DEFAULT false,
    "can_process_refund" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "merchant_capability_pkey" PRIMARY KEY ("merchant_id")
);

-- CreateTable
CREATE TABLE "mini_program_account" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "app_id" TEXT NOT NULL,
    "authorization_status" TEXT NOT NULL,
    "development_status" TEXT NOT NULL,
    "audit_status" TEXT NOT NULL,
    "release_status" TEXT NOT NULL,
    "overall_status" TEXT NOT NULL,
    "current_template_version" TEXT,
    "released_version" TEXT,
    "current_config_version" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mini_program_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_program_authorization" (
    "id" UUID NOT NULL,
    "mini_program_account_id" UUID NOT NULL,
    "authorization_status" TEXT NOT NULL,
    "authorization_scope_json" JSONB NOT NULL,
    "credential_ref" TEXT NOT NULL,
    "authorized_at" TIMESTAMPTZ(6) NOT NULL,
    "refreshed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "mini_program_authorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_program_config" (
    "id" UUID NOT NULL,
    "mini_program_account_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "config_version" INTEGER NOT NULL,
    "config_json" JSONB NOT NULL,
    "status" "MiniProgramConfigStatus" NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_program_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag" (
    "id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" UUID NOT NULL,
    "feature_code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_program_template" (
    "id" UUID NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" TEXT NOT NULL,
    "source_draft_id" TEXT,
    "status" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "mini_program_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_program_release_job" (
    "id" UUID NOT NULL,
    "mini_program_account_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "template_record_id" UUID NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL,
    "audit_id" TEXT,
    "status" "MiniProgramReleaseJobStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mini_program_release_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_account" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "mini_program_account_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "sp_mchid" TEXT NOT NULL,
    "sub_mchid" TEXT,
    "sub_appid" TEXT NOT NULL,
    "onboarding_status" TEXT NOT NULL,
    "appid_binding_status" TEXT NOT NULL,
    "payment_permission_status" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "credential_ref" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "product_code" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "status" TEXT NOT NULL,
    "current_published_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_version" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_item" (
    "id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_price" BIGINT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "media_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buy_campaign" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "campaign_code" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "current_published_version_id" UUID,
    "pending_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "group_buy_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buy_campaign_version" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "reference_price" BIGINT NOT NULL,
    "sale_price" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "sale_start_at" TIMESTAMPTZ(6) NOT NULL,
    "sale_end_at" TIMESTAMPTZ(6) NOT NULL,
    "store_scope" TEXT NOT NULL,
    "refund_policy_code" TEXT NOT NULL,
    "expiry_policy_code" TEXT NOT NULL,
    "reservation_required" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "group_buy_campaign_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_store" (
    "campaign_version_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,

    CONSTRAINT "campaign_store_pkey" PRIMARY KEY ("campaign_version_id","store_id")
);

-- CreateTable
CREATE TABLE "usage_rule" (
    "id" UUID NOT NULL,
    "campaign_version_id" UUID NOT NULL,
    "rule_type" "UsageRuleType" NOT NULL,
    "fixed_valid_from" TIMESTAMPTZ(6),
    "fixed_valid_until" TIMESTAMPTZ(6),
    "valid_days_after_purchase" INTEGER,

    CONSTRAINT "usage_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_weekly_time_rule" (
    "id" UUID NOT NULL,
    "usage_rule_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "all_day" BOOLEAN NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usage_weekly_time_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_blackout_date" (
    "id" UUID NOT NULL,
    "usage_rule_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,

    CONSTRAINT "usage_blackout_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_limit_rule" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "single_order_limit" INTEGER,
    "campaign_user_limit" INTEGER,
    "status" TEXT NOT NULL,

    CONSTRAINT "purchase_limit_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "inventory_mode" "InventoryMode" NOT NULL,
    "inventory_scope" "InventoryScope" NOT NULL,
    "total_stock" INTEGER,
    "reserved_stock" INTEGER NOT NULL DEFAULT 0,
    "sold_stock" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation" (
    "id" UUID NOT NULL,
    "reservation_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reserved_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "release_reason" TEXT,

    CONSTRAINT "inventory_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "adjustment_type" "InventoryAdjustmentType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "consumer_id" UUID NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "original_amount" BIGINT NOT NULL,
    "merchant_discount_amount" BIGINT NOT NULL DEFAULT 0,
    "platform_discount_amount" BIGINT NOT NULL DEFAULT 0,
    "other_discount_amount" BIGINT NOT NULL DEFAULT 0,
    "payable_amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "payment_deadline_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "fulfilled_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "campaign_version_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "unit_price_snapshot" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal_amount" BIGINT NOT NULL,
    "package_snapshot_json" JSONB NOT NULL,
    "usage_rule_snapshot_json" JSONB NOT NULL,
    "refund_policy_snapshot_json" JSONB NOT NULL,
    "expiry_policy_snapshot_json" JSONB NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "payment_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "consumer_id" UUID NOT NULL,
    "payment_account_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "effective_for_order" BOOLEAN NOT NULL DEFAULT false,
    "amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "provider_transaction_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "succeeded_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_callback_record" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "callback_type" TEXT NOT NULL,
    "merchant_id" UUID,
    "external_event_id" TEXT,
    "external_transaction_id" TEXT,
    "verification_status" TEXT NOT NULL,
    "processing_status" TEXT NOT NULL,
    "request_digest" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "integration_callback_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_policy" (
    "id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" UUID NOT NULL,
    "fee_type" TEXT NOT NULL,
    "rate_value" INTEGER NOT NULL,
    "rate_scale" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_until" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL,

    CONSTRAINT "fee_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_record" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "fee_policy_id" UUID NOT NULL,
    "fee_type" TEXT NOT NULL,
    "base_amount" BIGINT NOT NULL,
    "rate_value_snapshot" INTEGER NOT NULL,
    "rate_scale_snapshot" TEXT NOT NULL,
    "fee_amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_reversal" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "fee_record_id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "base_refund_amount" BIGINT NOT NULL,
    "reversal_amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_reversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_record" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "fulfillment_type" TEXT NOT NULL,
    "expected_quantity" INTEGER NOT NULL,
    "issued_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fulfillment_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" UUID NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "campaign_version_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "purchaser_consumer_id" UUID NOT NULL,
    "holder_consumer_id" UUID NOT NULL,
    "issued_sequence" INTEGER NOT NULL,
    "status" "VoucherStatus" NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "usage_rule_snapshot_json" JSONB NOT NULL,
    "refund_policy_snapshot_json" JSONB NOT NULL,
    "expiry_policy_snapshot_json" JSONB NOT NULL,
    "redeem_code_hash" TEXT NOT NULL,
    "redeemed_store_id" UUID,
    "redeemed_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption" (
    "id" UUID NOT NULL,
    "redemption_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "redeem_method" "RedemptionMethod" NOT NULL,
    "status" "RedemptionStatus" NOT NULL,
    "request_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),

    CONSTRAINT "redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_reversal" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "redemption_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "requested_by_type" TEXT NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "approved_by_type" TEXT,
    "approved_by_id" UUID,
    "reason_code" TEXT NOT NULL,
    "reason_text" TEXT,
    "status" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),

    CONSTRAINT "redemption_reversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" UUID NOT NULL,
    "refund_no" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "consumer_id" UUID NOT NULL,
    "refund_type" "RefundType" NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason_text" TEXT,
    "provider_refund_id" TEXT,
    "requested_by_type" TEXT NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "approved_by_type" TEXT,
    "approved_by_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "succeeded_at" TIMESTAMPTZ(6),

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_item" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "refund_amount" BIGINT NOT NULL,
    "voucher_status_before_refund" "VoucherStatusBeforeRefund" NOT NULL,

    CONSTRAINT "refund_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_event" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_outbox" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "EventOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_case" (
    "id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "target_version" INTEGER,
    "review_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "submitted_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "result" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "review_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_rule" (
    "id" UUID NOT NULL,
    "scene" "RiskScene" NOT NULL,
    "action" "RiskAction" NOT NULL,
    "rule_code" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_event" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "risk_rule_id" UUID,
    "scene" "RiskScene" NOT NULL,
    "action" "RiskAction" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "risk_context" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exception_record" (
    "id" UUID NOT NULL,
    "exception_no" TEXT NOT NULL,
    "merchant_id" UUID,
    "type" "ExceptionType" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "status" TEXT NOT NULL,
    "details_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "exception_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_job" (
    "id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL,
    "next_retry_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "exception_record_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "compensation_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_run" (
    "id" UUID NOT NULL,
    "type" "ReconciliationType" NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "reconciliation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_mismatch" (
    "id" UUID NOT NULL,
    "reconciliation_run_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "expected_json" JSONB NOT NULL,
    "actual_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "exception_record_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_mismatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "merchant_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "before_json" JSONB,
    "after_json" JSONB,
    "reason" TEXT,
    "request_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_event" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT,
    "actor_id" UUID,
    "context_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_case" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "details_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dispute_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_risk_investigation" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "result" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchant_risk_investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_clearing_case" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchant_clearing_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_clearing_item" (
    "id" UUID NOT NULL,
    "clearing_case_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "details_json" JSONB,

    CONSTRAINT "merchant_clearing_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_health" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "integration_type" TEXT NOT NULL,
    "target_id" UUID,
    "status" "IntegrationHealthStatus" NOT NULL,
    "details_json" JSONB,
    "checked_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_merchant_code_key" ON "merchant"("merchant_code");

-- CreateIndex
CREATE INDEX "brand_merchant_id_status_idx" ON "brand"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "brand_merchant_id_brand_code_key" ON "brand"("merchant_id", "brand_code");

-- CreateIndex
CREATE UNIQUE INDEX "brand_id_merchant_id_key" ON "brand"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "store_merchant_id_brand_id_status_idx" ON "store"("merchant_id", "brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "store_merchant_id_store_code_key" ON "store"("merchant_id", "store_code");

-- CreateIndex
CREATE UNIQUE INDEX "store_id_merchant_id_key" ON "store"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_permission_code_key" ON "permission"("permission_code");

-- CreateIndex
CREATE UNIQUE INDEX "role_id_merchant_id_key" ON "role"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_platform_code_key" ON "role"("role_code") WHERE (merchant_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_merchant_code_key" ON "role"("merchant_id", "role_code") WHERE (merchant_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "staff_merchant_id_status_idx" ON "staff"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_merchant_id_staff_code_key" ON "staff"("merchant_id", "staff_code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_id_merchant_id_key" ON "staff"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "staff_identity_staff_id_status_idx" ON "staff_identity"("staff_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_identity_provider_app_id_provider_subject_id_key" ON "staff_identity"("provider", "app_id", "provider_subject_id");

-- CreateIndex
CREATE INDEX "external_identity_consumer_id_idx" ON "external_identity"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_identity_provider_app_id_provider_subject_id_key" ON "external_identity"("provider", "app_id", "provider_subject_id");

-- CreateIndex
CREATE INDEX "merchant_consumer_consumer_id_idx" ON "merchant_consumer"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_consumer_merchant_id_consumer_id_key" ON "merchant_consumer"("merchant_id", "consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "mini_program_account_app_id_key" ON "mini_program_account"("app_id");

-- CreateIndex
CREATE INDEX "mini_program_account_merchant_id_overall_status_idx" ON "mini_program_account"("merchant_id", "overall_status");

-- CreateIndex
CREATE UNIQUE INDEX "mini_program_account_id_merchant_id_key" ON "mini_program_account"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "mini_program_authorization_mini_program_account_id_authoriz_idx" ON "mini_program_authorization"("mini_program_account_id", "authorized_at");

-- CreateIndex
CREATE UNIQUE INDEX "mini_program_authorization_active_key" ON "mini_program_authorization"("mini_program_account_id") WHERE (authorization_status = 'ACTIVE');

-- CreateIndex
CREATE INDEX "mini_program_config_merchant_id_status_idx" ON "mini_program_config"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mini_program_config_mini_program_account_id_config_version_key" ON "mini_program_config"("mini_program_account_id", "config_version");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_scope_type_scope_id_feature_code_key" ON "feature_flag"("scope_type", "scope_id", "feature_code");

-- CreateIndex
CREATE UNIQUE INDEX "mini_program_template_template_id_template_version_key" ON "mini_program_template"("template_id", "template_version");

-- CreateIndex
CREATE INDEX "mini_program_release_job_merchant_id_status_created_at_idx" ON "mini_program_release_job"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "mini_program_release_job_mini_program_account_id_status_idx" ON "mini_program_release_job"("mini_program_account_id", "status");

-- CreateIndex
CREATE INDEX "payment_account_merchant_id_status_idx" ON "payment_account"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_account_id_merchant_id_key" ON "payment_account"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_account_provider_sub_mchid_key" ON "payment_account"("provider", "sub_mchid") WHERE (sub_mchid IS NOT NULL);

-- CreateIndex
CREATE INDEX "product_merchant_id_brand_id_status_idx" ON "product"("merchant_id", "brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_merchant_id_product_code_key" ON "product"("merchant_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_id_merchant_id_key" ON "product"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "product_version_merchant_id_status_idx" ON "product_version"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_product_id_version_no_key" ON "product_version"("product_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_id_merchant_id_key" ON "product_version"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_published_key" ON "product_version"("product_id") WHERE (status = 'PUBLISHED');

-- CreateIndex
CREATE INDEX "package_item_product_version_id_sort_order_idx" ON "package_item"("product_version_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_media_product_version_id_sort_order_idx" ON "product_media"("product_version_id", "sort_order");

-- CreateIndex
CREATE INDEX "group_buy_campaign_merchant_id_brand_id_status_idx" ON "group_buy_campaign"("merchant_id", "brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_campaign_merchant_id_campaign_code_key" ON "group_buy_campaign"("merchant_id", "campaign_code");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_campaign_id_merchant_id_key" ON "group_buy_campaign"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "group_buy_campaign_version_merchant_id_status_idx" ON "group_buy_campaign_version"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_campaign_version_campaign_id_version_no_key" ON "group_buy_campaign_version"("campaign_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_campaign_version_id_merchant_id_key" ON "group_buy_campaign_version"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_version_published_key" ON "group_buy_campaign_version"("campaign_id") WHERE (status = 'PUBLISHED');

-- CreateIndex
CREATE INDEX "campaign_store_merchant_id_store_id_idx" ON "campaign_store"("merchant_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_rule_campaign_version_id_key" ON "usage_rule"("campaign_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_weekly_time_rule_usage_rule_id_weekday_key" ON "usage_weekly_time_rule"("usage_rule_id", "weekday");

-- CreateIndex
CREATE INDEX "usage_blackout_date_usage_rule_id_start_date_end_date_idx" ON "usage_blackout_date"("usage_rule_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_limit_rule_campaign_id_key" ON "purchase_limit_rule"("campaign_id");

-- CreateIndex
CREATE INDEX "inventory_merchant_id_inventory_mode_idx" ON "inventory"("merchant_id", "inventory_mode");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_id_merchant_id_key" ON "inventory"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_campaign_id_merchant_id_key" ON "inventory"("campaign_id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_reservation_no_key" ON "inventory_reservation"("reservation_no");

-- CreateIndex
CREATE INDEX "inventory_reservation_merchant_id_status_expires_at_idx" ON "inventory_reservation"("merchant_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_order_id_inventory_id_key" ON "inventory_reservation"("order_id", "inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_merchant_id_idempotency_key_key" ON "inventory_reservation"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "inventory_adjustment_merchant_id_inventory_id_created_at_idx" ON "inventory_adjustment"("merchant_id", "inventory_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_merchant_id_consumer_id_created_at_idx" ON "orders"("merchant_id", "consumer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_merchant_id_status_created_at_idx" ON "orders"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_id_merchant_id_key" ON "orders"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "order_item_merchant_id_order_id_idx" ON "order_item"("merchant_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_id_merchant_id_key" ON "order_item"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_payment_no_key" ON "payment"("payment_no");

-- CreateIndex
CREATE INDEX "payment_merchant_id_order_id_status_idx" ON "payment"("merchant_id", "order_id", "status");

-- CreateIndex
CREATE INDEX "payment_merchant_id_status_created_at_idx" ON "payment"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_provider_transaction_id_key" ON "payment"("provider", "provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_merchant_id_idempotency_key_key" ON "payment"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_effective_success_key" ON "payment"("order_id") WHERE (status = 'SUCCESS' AND effective_for_order = true);

-- CreateIndex
CREATE UNIQUE INDEX "payment_id_merchant_id_key" ON "payment"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "integration_callback_record_provider_external_transaction_i_idx" ON "integration_callback_record"("provider", "external_transaction_id");

-- CreateIndex
CREATE INDEX "integration_callback_record_processing_status_received_at_idx" ON "integration_callback_record"("processing_status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_callback_record_provider_callback_type_external_key" ON "integration_callback_record"("provider", "callback_type", "external_event_id");

-- CreateIndex
CREATE INDEX "fee_policy_scope_type_scope_id_fee_type_status_idx" ON "fee_policy"("scope_type", "scope_id", "fee_type", "status");

-- CreateIndex
CREATE INDEX "fee_record_merchant_id_created_at_idx" ON "fee_record"("merchant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fee_record_payment_id_fee_type_key" ON "fee_record"("payment_id", "fee_type");

-- CreateIndex
CREATE UNIQUE INDEX "fee_record_id_merchant_id_key" ON "fee_record"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "fee_reversal_merchant_id_idx" ON "fee_reversal"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_reversal_fee_record_id_refund_id_key" ON "fee_reversal"("fee_record_id", "refund_id");

-- CreateIndex
CREATE INDEX "fulfillment_record_merchant_id_status_idx" ON "fulfillment_record"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_record_order_item_id_fulfillment_type_key" ON "fulfillment_record"("order_item_id", "fulfillment_type");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_voucher_no_key" ON "voucher"("voucher_no");

-- CreateIndex
CREATE INDEX "voucher_merchant_id_holder_consumer_id_status_idx" ON "voucher"("merchant_id", "holder_consumer_id", "status");

-- CreateIndex
CREATE INDEX "voucher_merchant_id_campaign_id_status_idx" ON "voucher"("merchant_id", "campaign_id", "status");

-- CreateIndex
CREATE INDEX "voucher_redeem_code_hash_idx" ON "voucher"("redeem_code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_order_item_id_issued_sequence_key" ON "voucher"("order_item_id", "issued_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_id_merchant_id_key" ON "voucher"("id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_redemption_no_key" ON "redemption"("redemption_no");

-- CreateIndex
CREATE INDEX "redemption_merchant_id_store_id_confirmed_at_idx" ON "redemption"("merchant_id", "store_id", "confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_merchant_id_idempotency_key_key" ON "redemption"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_voucher_success_key" ON "redemption"("voucher_id") WHERE (status = 'SUCCESS');

-- CreateIndex
CREATE UNIQUE INDEX "redemption_id_merchant_id_key" ON "redemption"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "redemption_reversal_merchant_id_status_requested_at_idx" ON "redemption_reversal"("merchant_id", "status", "requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "refund_refund_no_key" ON "refund"("refund_no");

-- CreateIndex
CREATE UNIQUE INDEX "refund_provider_refund_id_key" ON "refund"("provider_refund_id");

-- CreateIndex
CREATE INDEX "refund_merchant_id_payment_id_status_idx" ON "refund"("merchant_id", "payment_id", "status");

-- CreateIndex
CREATE INDEX "refund_merchant_id_status_created_at_idx" ON "refund"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refund_merchant_id_idempotency_key_key" ON "refund"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_id_merchant_id_key" ON "refund"("id", "merchant_id");

-- CreateIndex
CREATE INDEX "refund_item_merchant_id_voucher_id_idx" ON "refund_item"("merchant_id", "voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_item_refund_id_voucher_id_key" ON "refund_item"("refund_id", "voucher_id");

-- CreateIndex
CREATE INDEX "order_event_merchant_id_order_id_occurred_at_idx" ON "order_event"("merchant_id", "order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "event_outbox_status_next_attempt_at_created_at_idx" ON "event_outbox"("status", "next_attempt_at", "created_at");

-- CreateIndex
CREATE INDEX "event_outbox_merchant_id_aggregate_type_aggregate_id_idx" ON "event_outbox"("merchant_id", "aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "review_case_target_type_target_id_target_version_idx" ON "review_case"("target_type", "target_id", "target_version");

-- CreateIndex
CREATE INDEX "review_case_status_submitted_at_idx" ON "review_case"("status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "risk_rule_rule_code_key" ON "risk_rule"("rule_code");

-- CreateIndex
CREATE INDEX "risk_rule_scene_status_priority_idx" ON "risk_rule"("scene", "status", "priority");

-- CreateIndex
CREATE INDEX "risk_event_merchant_id_scene_created_at_idx" ON "risk_event"("merchant_id", "scene", "created_at");

-- CreateIndex
CREATE INDEX "risk_event_target_type_target_id_idx" ON "risk_event"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "exception_record_exception_no_key" ON "exception_record"("exception_no");

-- CreateIndex
CREATE INDEX "exception_record_merchant_id_status_created_at_idx" ON "exception_record"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "exception_record_type_status_idx" ON "exception_record"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "compensation_job_idempotency_key_key" ON "compensation_job"("idempotency_key");

-- CreateIndex
CREATE INDEX "compensation_job_status_next_retry_at_idx" ON "compensation_job"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "reconciliation_run_type_started_at_idx" ON "reconciliation_run"("type", "started_at");

-- CreateIndex
CREATE INDEX "reconciliation_mismatch_reconciliation_run_id_status_idx" ON "reconciliation_mismatch"("reconciliation_run_id", "status");

-- CreateIndex
CREATE INDEX "reconciliation_mismatch_entity_type_entity_id_idx" ON "reconciliation_mismatch"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_merchant_id_created_at_idx" ON "audit_log"("merchant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_created_at_idx" ON "audit_log"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");

-- CreateIndex
CREATE INDEX "security_event_merchant_id_event_type_created_at_idx" ON "security_event"("merchant_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "dispute_case_merchant_id_status_created_at_idx" ON "dispute_case"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "merchant_risk_investigation_merchant_id_status_idx" ON "merchant_risk_investigation"("merchant_id", "status");

-- CreateIndex
CREATE INDEX "merchant_clearing_case_merchant_id_status_idx" ON "merchant_clearing_case"("merchant_id", "status");

-- CreateIndex
CREATE INDEX "merchant_clearing_item_clearing_case_id_status_idx" ON "merchant_clearing_item"("clearing_case_id", "status");

-- CreateIndex
CREATE INDEX "integration_health_merchant_id_status_idx" ON "integration_health"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_health_integration_type_target_id_key" ON "integration_health"("integration_type", "target_id");

-- AddForeignKey
ALTER TABLE "brand" ADD CONSTRAINT "brand_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_primary_store_id_merchant_id_fkey" FOREIGN KEY ("primary_store_id", "merchant_id") REFERENCES "store"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_id_merchant_id_fkey" FOREIGN KEY ("role_id", "merchant_id") REFERENCES "role"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_identity" ADD CONSTRAINT "staff_identity_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identity" ADD CONSTRAINT "external_identity_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_consumer" ADD CONSTRAINT "merchant_consumer_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_consumer" ADD CONSTRAINT "merchant_consumer_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_capability" ADD CONSTRAINT "merchant_capability_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_account" ADD CONSTRAINT "mini_program_account_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_account" ADD CONSTRAINT "mini_program_account_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_authorization" ADD CONSTRAINT "mini_program_authorization_mini_program_account_id_fkey" FOREIGN KEY ("mini_program_account_id") REFERENCES "mini_program_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_config" ADD CONSTRAINT "mini_program_config_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_config" ADD CONSTRAINT "mini_program_config_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_config" ADD CONSTRAINT "mini_program_config_mini_program_account_id_merchant_id_fkey" FOREIGN KEY ("mini_program_account_id", "merchant_id") REFERENCES "mini_program_account"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_release_job" ADD CONSTRAINT "mini_program_release_job_mini_program_account_id_merchant__fkey" FOREIGN KEY ("mini_program_account_id", "merchant_id") REFERENCES "mini_program_account"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_release_job" ADD CONSTRAINT "mini_program_release_job_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_program_release_job" ADD CONSTRAINT "mini_program_release_job_template_record_id_fkey" FOREIGN KEY ("template_record_id") REFERENCES "mini_program_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_account" ADD CONSTRAINT "payment_account_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_account" ADD CONSTRAINT "payment_account_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_account" ADD CONSTRAINT "payment_account_mini_program_account_id_merchant_id_fkey" FOREIGN KEY ("mini_program_account_id", "merchant_id") REFERENCES "mini_program_account"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_current_published_version_id_merchant_id_fkey" FOREIGN KEY ("current_published_version_id", "merchant_id") REFERENCES "product_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_version" ADD CONSTRAINT "product_version_product_id_merchant_id_fkey" FOREIGN KEY ("product_id", "merchant_id") REFERENCES "product"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_item" ADD CONSTRAINT "package_item_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign" ADD CONSTRAINT "group_buy_campaign_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign" ADD CONSTRAINT "group_buy_campaign_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign" ADD CONSTRAINT "group_buy_campaign_product_id_merchant_id_fkey" FOREIGN KEY ("product_id", "merchant_id") REFERENCES "product"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign" ADD CONSTRAINT "group_buy_campaign_current_published_version_id_merchant_i_fkey" FOREIGN KEY ("current_published_version_id", "merchant_id") REFERENCES "group_buy_campaign_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign" ADD CONSTRAINT "group_buy_campaign_pending_version_id_merchant_id_fkey" FOREIGN KEY ("pending_version_id", "merchant_id") REFERENCES "group_buy_campaign_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign_version" ADD CONSTRAINT "group_buy_campaign_version_campaign_id_merchant_id_fkey" FOREIGN KEY ("campaign_id", "merchant_id") REFERENCES "group_buy_campaign"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign_version" ADD CONSTRAINT "group_buy_campaign_version_product_version_id_merchant_id_fkey" FOREIGN KEY ("product_version_id", "merchant_id") REFERENCES "product_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_campaign_version" ADD CONSTRAINT "group_buy_campaign_version_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_store" ADD CONSTRAINT "campaign_store_campaign_version_id_merchant_id_fkey" FOREIGN KEY ("campaign_version_id", "merchant_id") REFERENCES "group_buy_campaign_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_store" ADD CONSTRAINT "campaign_store_store_id_merchant_id_fkey" FOREIGN KEY ("store_id", "merchant_id") REFERENCES "store"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_rule" ADD CONSTRAINT "usage_rule_campaign_version_id_fkey" FOREIGN KEY ("campaign_version_id") REFERENCES "group_buy_campaign_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_weekly_time_rule" ADD CONSTRAINT "usage_weekly_time_rule_usage_rule_id_fkey" FOREIGN KEY ("usage_rule_id") REFERENCES "usage_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_blackout_date" ADD CONSTRAINT "usage_blackout_date_usage_rule_id_fkey" FOREIGN KEY ("usage_rule_id") REFERENCES "usage_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_limit_rule" ADD CONSTRAINT "purchase_limit_rule_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "group_buy_campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_campaign_id_merchant_id_fkey" FOREIGN KEY ("campaign_id", "merchant_id") REFERENCES "group_buy_campaign"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_inventory_id_merchant_id_fkey" FOREIGN KEY ("inventory_id", "merchant_id") REFERENCES "inventory"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_inventory_id_merchant_id_fkey" FOREIGN KEY ("inventory_id", "merchant_id") REFERENCES "inventory"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_merchant_id_fkey" FOREIGN KEY ("product_id", "merchant_id") REFERENCES "product"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_version_id_merchant_id_fkey" FOREIGN KEY ("product_version_id", "merchant_id") REFERENCES "product_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_campaign_id_merchant_id_fkey" FOREIGN KEY ("campaign_id", "merchant_id") REFERENCES "group_buy_campaign"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_campaign_version_id_merchant_id_fkey" FOREIGN KEY ("campaign_version_id", "merchant_id") REFERENCES "group_buy_campaign_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_account_id_merchant_id_fkey" FOREIGN KEY ("payment_account_id", "merchant_id") REFERENCES "payment_account"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_callback_record" ADD CONSTRAINT "integration_callback_record_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_record" ADD CONSTRAINT "fee_record_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_record" ADD CONSTRAINT "fee_record_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_record" ADD CONSTRAINT "fee_record_payment_id_merchant_id_fkey" FOREIGN KEY ("payment_id", "merchant_id") REFERENCES "payment"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_record" ADD CONSTRAINT "fee_record_fee_policy_id_fkey" FOREIGN KEY ("fee_policy_id") REFERENCES "fee_policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal" ADD CONSTRAINT "fee_reversal_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal" ADD CONSTRAINT "fee_reversal_fee_record_id_merchant_id_fkey" FOREIGN KEY ("fee_record_id", "merchant_id") REFERENCES "fee_record"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal" ADD CONSTRAINT "fee_reversal_refund_id_merchant_id_fkey" FOREIGN KEY ("refund_id", "merchant_id") REFERENCES "refund"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_record" ADD CONSTRAINT "fulfillment_record_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_record" ADD CONSTRAINT "fulfillment_record_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_record" ADD CONSTRAINT "fulfillment_record_order_item_id_merchant_id_fkey" FOREIGN KEY ("order_item_id", "merchant_id") REFERENCES "order_item"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id", "merchant_id") REFERENCES "brand"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_order_item_id_merchant_id_fkey" FOREIGN KEY ("order_item_id", "merchant_id") REFERENCES "order_item"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_campaign_id_merchant_id_fkey" FOREIGN KEY ("campaign_id", "merchant_id") REFERENCES "group_buy_campaign"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_campaign_version_id_merchant_id_fkey" FOREIGN KEY ("campaign_version_id", "merchant_id") REFERENCES "group_buy_campaign_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_product_version_id_merchant_id_fkey" FOREIGN KEY ("product_version_id", "merchant_id") REFERENCES "product_version"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_purchaser_consumer_id_fkey" FOREIGN KEY ("purchaser_consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_holder_consumer_id_fkey" FOREIGN KEY ("holder_consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_redeemed_store_id_merchant_id_fkey" FOREIGN KEY ("redeemed_store_id", "merchant_id") REFERENCES "store"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption" ADD CONSTRAINT "redemption_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption" ADD CONSTRAINT "redemption_voucher_id_merchant_id_fkey" FOREIGN KEY ("voucher_id", "merchant_id") REFERENCES "voucher"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption" ADD CONSTRAINT "redemption_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption" ADD CONSTRAINT "redemption_store_id_merchant_id_fkey" FOREIGN KEY ("store_id", "merchant_id") REFERENCES "store"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption" ADD CONSTRAINT "redemption_staff_id_merchant_id_fkey" FOREIGN KEY ("staff_id", "merchant_id") REFERENCES "staff"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_reversal" ADD CONSTRAINT "redemption_reversal_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_reversal" ADD CONSTRAINT "redemption_reversal_redemption_id_merchant_id_fkey" FOREIGN KEY ("redemption_id", "merchant_id") REFERENCES "redemption"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_reversal" ADD CONSTRAINT "redemption_reversal_voucher_id_merchant_id_fkey" FOREIGN KEY ("voucher_id", "merchant_id") REFERENCES "voucher"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_merchant_id_fkey" FOREIGN KEY ("payment_id", "merchant_id") REFERENCES "payment"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item" ADD CONSTRAINT "refund_item_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item" ADD CONSTRAINT "refund_item_refund_id_merchant_id_fkey" FOREIGN KEY ("refund_id", "merchant_id") REFERENCES "refund"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item" ADD CONSTRAINT "refund_item_order_item_id_merchant_id_fkey" FOREIGN KEY ("order_item_id", "merchant_id") REFERENCES "order_item"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item" ADD CONSTRAINT "refund_item_voucher_id_merchant_id_fkey" FOREIGN KEY ("voucher_id", "merchant_id") REFERENCES "voucher"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_merchant_id_fkey" FOREIGN KEY ("order_id", "merchant_id") REFERENCES "orders"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_event" ADD CONSTRAINT "risk_event_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_event" ADD CONSTRAINT "risk_event_risk_rule_id_fkey" FOREIGN KEY ("risk_rule_id") REFERENCES "risk_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_record" ADD CONSTRAINT "exception_record_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_job" ADD CONSTRAINT "compensation_job_exception_record_id_fkey" FOREIGN KEY ("exception_record_id") REFERENCES "exception_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_mismatch" ADD CONSTRAINT "reconciliation_mismatch_reconciliation_run_id_fkey" FOREIGN KEY ("reconciliation_run_id") REFERENCES "reconciliation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_mismatch" ADD CONSTRAINT "reconciliation_mismatch_exception_record_id_fkey" FOREIGN KEY ("exception_record_id") REFERENCES "exception_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_case" ADD CONSTRAINT "dispute_case_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_risk_investigation" ADD CONSTRAINT "merchant_risk_investigation_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_clearing_case" ADD CONSTRAINT "merchant_clearing_case_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_clearing_item" ADD CONSTRAINT "merchant_clearing_item_clearing_case_id_fkey" FOREIGN KEY ("clearing_case_id") REFERENCES "merchant_clearing_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_health" ADD CONSTRAINT "integration_health_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Baseline CHECK constraints that Prisma Schema Language cannot express.
ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_reserved_stock_nonnegative_check" CHECK ("reserved_stock" >= 0),
  ADD CONSTRAINT "inventory_sold_stock_nonnegative_check" CHECK ("sold_stock" >= 0),
  ADD CONSTRAINT "inventory_low_stock_threshold_nonnegative_check" CHECK ("low_stock_threshold" IS NULL OR "low_stock_threshold" >= 0),
  ADD CONSTRAINT "inventory_mode_stock_check" CHECK (
    ("inventory_mode" = 'LIMITED' AND "total_stock" IS NOT NULL AND "total_stock" >= "reserved_stock" + "sold_stock")
    OR
    ("inventory_mode" = 'UNLIMITED' AND "total_stock" IS NULL)
  );

ALTER TABLE "package_item"
  ADD CONSTRAINT "package_item_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "package_item_reference_price_nonnegative_check" CHECK ("reference_price" IS NULL OR "reference_price" >= 0);

ALTER TABLE "purchase_limit_rule"
  ADD CONSTRAINT "purchase_limit_single_order_positive_check" CHECK ("single_order_limit" IS NULL OR "single_order_limit" > 0),
  ADD CONSTRAINT "purchase_limit_campaign_user_positive_check" CHECK ("campaign_user_limit" IS NULL OR "campaign_user_limit" > 0);

ALTER TABLE "inventory_reservation"
  ADD CONSTRAINT "inventory_reservation_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "inventory_reservation_time_range_check" CHECK ("expires_at" > "reserved_at");

ALTER TABLE "inventory_adjustment"
  ADD CONSTRAINT "inventory_adjustment_quantity_positive_check" CHECK ("quantity" > 0);

ALTER TABLE "group_buy_campaign_version"
  ADD CONSTRAINT "campaign_version_reference_price_nonnegative_check" CHECK ("reference_price" >= 0),
  ADD CONSTRAINT "campaign_version_sale_price_nonnegative_check" CHECK ("sale_price" >= 0),
  ADD CONSTRAINT "campaign_version_sale_time_range_check" CHECK ("sale_end_at" > "sale_start_at");

ALTER TABLE "usage_rule"
  ADD CONSTRAINT "usage_rule_shape_check" CHECK (
    (
      "rule_type" = 'FIXED_RANGE'
      AND "fixed_valid_from" IS NOT NULL
      AND "fixed_valid_until" IS NOT NULL
      AND "fixed_valid_until" > "fixed_valid_from"
      AND "valid_days_after_purchase" IS NULL
    )
    OR
    (
      "rule_type" = 'AFTER_PURCHASE'
      AND "fixed_valid_from" IS NULL
      AND "fixed_valid_until" IS NULL
      AND "valid_days_after_purchase" > 0
    )
  );

ALTER TABLE "usage_weekly_time_rule"
  ADD CONSTRAINT "usage_weekly_time_shape_check" CHECK (
    ("all_day" = true AND "start_time" IS NULL AND "end_time" IS NULL)
    OR
    ("all_day" = false AND "start_time" IS NOT NULL AND "end_time" IS NOT NULL AND "end_time" > "start_time")
  );

ALTER TABLE "usage_blackout_date"
  ADD CONSTRAINT "usage_blackout_date_range_check" CHECK ("end_date" >= "start_date");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_nonnegative_check" CHECK (
    "original_amount" >= 0
    AND "merchant_discount_amount" >= 0
    AND "platform_discount_amount" >= 0
    AND "other_discount_amount" >= 0
    AND "payable_amount" >= 0
  );

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_item_amounts_nonnegative_check" CHECK ("unit_price_snapshot" >= 0 AND "subtotal_amount" >= 0);

ALTER TABLE "payment"
  ADD CONSTRAINT "payment_amount_nonnegative_check" CHECK ("amount" >= 0);

ALTER TABLE "fee_record"
  ADD CONSTRAINT "fee_record_amounts_nonnegative_check" CHECK ("base_amount" >= 0 AND "fee_amount" >= 0),
  ADD CONSTRAINT "fee_record_rate_nonnegative_check" CHECK ("rate_value_snapshot" >= 0);

ALTER TABLE "fee_reversal"
  ADD CONSTRAINT "fee_reversal_amounts_nonnegative_check" CHECK ("base_refund_amount" >= 0 AND "reversal_amount" >= 0);

ALTER TABLE "fulfillment_record"
  ADD CONSTRAINT "fulfillment_quantities_check" CHECK (
    "expected_quantity" > 0
    AND "issued_quantity" >= 0
    AND "issued_quantity" <= "expected_quantity"
  );

ALTER TABLE "voucher"
  ADD CONSTRAINT "voucher_issued_sequence_positive_check" CHECK ("issued_sequence" > 0),
  ADD CONSTRAINT "voucher_validity_range_check" CHECK ("valid_until" > "valid_from");

ALTER TABLE "refund"
  ADD CONSTRAINT "refund_amount_nonnegative_check" CHECK ("amount" >= 0);

ALTER TABLE "refund_item"
  ADD CONSTRAINT "refund_item_amount_nonnegative_check" CHECK ("refund_amount" >= 0);

ALTER TABLE "compensation_job"
  ADD CONSTRAINT "compensation_attempts_check" CHECK (
    "attempt_count" >= 0
    AND "max_attempts" > 0
    AND "attempt_count" <= "max_attempts"
  );

ALTER TABLE "mini_program_release_job"
  ADD CONSTRAINT "mini_program_release_attempt_count_check" CHECK ("attempt_count" >= 0);

-- A Refund must reference a Payment from the same Order and Merchant.
CREATE UNIQUE INDEX "payment_id_order_id_merchant_id_key"
  ON "payment"("id", "order_id", "merchant_id");

ALTER TABLE "refund"
  ADD CONSTRAINT "refund_payment_order_merchant_fkey"
  FOREIGN KEY ("payment_id", "order_id", "merchant_id")
  REFERENCES "payment"("id", "order_id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- A successful Payment is an immutable external money fact.
CREATE FUNCTION "protect_payment_success"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'SUCCESS' AND NEW."status" <> 'SUCCESS' THEN
    RAISE EXCEPTION 'Payment SUCCESS status is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "payment_success_immutable_trigger"
  BEFORE UPDATE OF "status" ON "payment"
  FOR EACH ROW EXECUTE FUNCTION "protect_payment_success"();

-- Serialize Refund allocation by Payment and enforce its aggregate ceiling.
CREATE FUNCTION "enforce_refund_payment_ceiling"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payment_amount bigint;
  occupied_amount bigint;
BEGIN
  SELECT "amount" INTO payment_amount
  FROM "payment"
  WHERE "id" = NEW."payment_id" AND "merchant_id" = NEW."merchant_id"
  FOR UPDATE;

  IF payment_amount IS NULL THEN
    RAISE EXCEPTION 'Referenced Payment does not exist in this Merchant';
  END IF;

  SELECT COALESCE(SUM("amount"), 0) INTO occupied_amount
  FROM "refund"
  WHERE "payment_id" = NEW."payment_id"
    AND "merchant_id" = NEW."merchant_id"
    AND "id" <> NEW."id"
    AND "status" IN ('APPROVED', 'PROCESSING', 'CONFIRMING', 'SUCCESS');

  IF NEW."status" IN ('APPROVED', 'PROCESSING', 'CONFIRMING', 'SUCCESS') THEN
    occupied_amount := occupied_amount + NEW."amount";
  END IF;

  IF occupied_amount > payment_amount THEN
    RAISE EXCEPTION 'Refund occupied amount exceeds Payment amount';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "refund_payment_ceiling_trigger"
  BEFORE INSERT OR UPDATE OF "amount", "status", "payment_id", "merchant_id" ON "refund"
  FOR EACH ROW EXECUTE FUNCTION "enforce_refund_payment_ceiling"();

-- Voucher sequence and Order linkage must agree with the purchased OrderItem.
CREATE FUNCTION "enforce_voucher_order_item"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_order_id uuid;
  item_quantity integer;
BEGIN
  SELECT "order_id", "quantity" INTO item_order_id, item_quantity
  FROM "order_item"
  WHERE "id" = NEW."order_item_id" AND "merchant_id" = NEW."merchant_id";

  IF item_order_id IS NULL OR item_order_id <> NEW."order_id" THEN
    RAISE EXCEPTION 'Voucher OrderItem does not belong to the supplied Order';
  END IF;

  IF NEW."issued_sequence" > item_quantity THEN
    RAISE EXCEPTION 'Voucher issued_sequence exceeds OrderItem quantity';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "voucher_order_item_trigger"
  BEFORE INSERT OR UPDATE OF "order_id", "order_item_id", "merchant_id", "issued_sequence" ON "voucher"
  FOR EACH ROW EXECUTE FUNCTION "enforce_voucher_order_item"();

-- RefundItem must reference a Voucher and OrderItem from its Refund's Order.
CREATE FUNCTION "enforce_refund_item_scope"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  refund_order_id uuid;
  voucher_order_id uuid;
  voucher_order_item_id uuid;
BEGIN
  SELECT "order_id" INTO refund_order_id
  FROM "refund"
  WHERE "id" = NEW."refund_id" AND "merchant_id" = NEW."merchant_id";

  SELECT "order_id", "order_item_id" INTO voucher_order_id, voucher_order_item_id
  FROM "voucher"
  WHERE "id" = NEW."voucher_id" AND "merchant_id" = NEW."merchant_id";

  IF refund_order_id IS NULL
    OR voucher_order_id IS NULL
    OR refund_order_id <> voucher_order_id
    OR voucher_order_item_id <> NEW."order_item_id"
  THEN
    RAISE EXCEPTION 'RefundItem Voucher does not belong to the Refund Order/OrderItem';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "refund_item_scope_trigger"
  BEFORE INSERT OR UPDATE OF "refund_id", "merchant_id", "order_item_id", "voucher_id" ON "refund_item"
  FOR EACH ROW EXECUTE FUNCTION "enforce_refund_item_scope"();

-- Core transaction facts are append/state-transition records, not deletable rows.
CREATE FUNCTION "prevent_core_fact_delete"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Physical deletion of core transaction facts is prohibited';
END;
$$;

CREATE TRIGGER "orders_prevent_delete" BEFORE DELETE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "payment_prevent_delete" BEFORE DELETE ON "payment"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "refund_prevent_delete" BEFORE DELETE ON "refund"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "voucher_prevent_delete" BEFORE DELETE ON "voucher"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "redemption_prevent_delete" BEFORE DELETE ON "redemption"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "fee_record_prevent_delete" BEFORE DELETE ON "fee_record"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "audit_log_prevent_delete" BEFORE DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "risk_event_prevent_delete" BEFORE DELETE ON "risk_event"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "exception_record_prevent_delete" BEFORE DELETE ON "exception_record"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "reconciliation_run_prevent_delete" BEFORE DELETE ON "reconciliation_run"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
CREATE TRIGGER "reconciliation_mismatch_prevent_delete" BEFORE DELETE ON "reconciliation_mismatch"
  FOR EACH ROW EXECUTE FUNCTION "prevent_core_fact_delete"();
