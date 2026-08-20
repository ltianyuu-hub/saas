import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required.');
}

const parsedDatabaseUrl = new URL(testDatabaseUrl);
if (
  !new Set(['127.0.0.1', 'localhost', '::1', '[::1]']).has(
    parsedDatabaseUrl.hostname,
  ) ||
  parsedDatabaseUrl.pathname !== '/saas_test'
) {
  throw new Error(
    'Integration tests may only use the local saas_test database.',
  );
}

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });

async function withRollback(run) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await run(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

async function expectDatabaseRejection(promise, code) {
  try {
    await promise;
    throw new Error(`Expected PostgreSQL error ${code}.`);
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

async function insertOrder(client, fixture, orderId = randomUUID()) {
  await client.query(
    `INSERT INTO "orders" (
      "id", "order_no", "merchant_id", "brand_id", "consumer_id",
      "order_type", "status", "original_amount", "merchant_discount_amount",
      "platform_discount_amount", "other_discount_amount", "payable_amount",
      "currency", "payment_deadline_at", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, 'GROUP_BUY', 'PENDING_PAYMENT',
      200, 0, 0, 0, 200, 'CNY', now() + interval '30 minutes', now())`,
    [
      orderId,
      `ORD-${orderId}`,
      fixture.merchantId,
      fixture.brandId,
      fixture.consumerId,
    ],
  );
  return orderId;
}

async function insertPayment(
  client,
  fixture,
  { status = 'CREATED', effective = false, amount = 200 } = {},
) {
  const paymentId = randomUUID();
  await client.query(
    `INSERT INTO "payment" (
      "id", "payment_no", "merchant_id", "order_id", "consumer_id",
      "payment_account_id", "provider", "status", "effective_for_order",
      "amount", "currency", "idempotency_key", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'WECHAT_PAY', $7, $8, $9, 'CNY', $10, now())`,
    [
      paymentId,
      `PAY-${paymentId}`,
      fixture.merchantId,
      fixture.orderId,
      fixture.consumerId,
      fixture.paymentAccountId,
      status,
      effective,
      amount,
      `payment-${paymentId}`,
    ],
  );
  return paymentId;
}

async function insertVoucher(client, fixture, sequence = 1) {
  const voucherId = randomUUID();
  await client.query(
    `INSERT INTO "voucher" (
      "id", "voucher_no", "merchant_id", "brand_id", "order_id",
      "order_item_id", "campaign_id", "campaign_version_id",
      "product_version_id", "purchaser_consumer_id", "holder_consumer_id",
      "issued_sequence", "status", "valid_from", "valid_until",
      "usage_rule_snapshot_json", "refund_policy_snapshot_json",
      "expiry_policy_snapshot_json", "redeem_code_hash", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10,
      $11, 'UNUSED', now(), now() + interval '30 days', '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, $12, now())`,
    [
      voucherId,
      `VOU-${voucherId}`,
      fixture.merchantId,
      fixture.brandId,
      fixture.orderId,
      fixture.orderItemId,
      fixture.campaignId,
      fixture.campaignVersionId,
      fixture.productVersionId,
      fixture.consumerId,
      sequence,
      `hash-${voucherId}`,
    ],
  );
  return voucherId;
}

async function insertRefund(
  client,
  fixture,
  paymentId,
  { orderId = fixture.orderId, amount = 100, status = 'REQUESTED' } = {},
) {
  const refundId = randomUUID();
  await client.query(
    `INSERT INTO "refund" (
      "id", "refund_no", "merchant_id", "order_id", "payment_id",
      "consumer_id", "refund_type", "status", "amount", "currency",
      "reason_code", "requested_by_type", "requested_by_id",
      "idempotency_key", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'NORMAL', $7, $8, 'CNY',
      'TEST', 'CONSUMER', $6, $9, now())`,
    [
      refundId,
      `REF-${refundId}`,
      fixture.merchantId,
      orderId,
      paymentId,
      fixture.consumerId,
      status,
      amount,
      `refund-${refundId}`,
    ],
  );
  return refundId;
}

async function createFixture(client) {
  const fixture = {
    merchantId: randomUUID(),
    brandId: randomUUID(),
    storeId: randomUUID(),
    roleId: randomUUID(),
    staffId: randomUUID(),
    consumerId: randomUUID(),
    miniProgramAccountId: randomUUID(),
    paymentAccountId: randomUUID(),
    productId: randomUUID(),
    productVersionId: randomUUID(),
    campaignId: randomUUID(),
    campaignVersionId: randomUUID(),
    inventoryId: randomUUID(),
    orderId: randomUUID(),
    orderItemId: randomUUID(),
  };

  await client.query(
    `INSERT INTO "merchant" (
      "id", "merchant_code", "display_name", "legal_entity_name",
      "contact_name", "contact_phone", "status", "updated_at"
    ) VALUES ($1, $2, 'Test Merchant', 'Test Entity', 'Tester',
      '00000000000', 'ACTIVE', now())`,
    [fixture.merchantId, `MER-${fixture.merchantId}`],
  );
  await client.query(
    `INSERT INTO "brand" (
      "id", "merchant_id", "brand_code", "name", "status", "updated_at"
    ) VALUES ($1, $2, $3, 'Test Brand', 'ACTIVE', now())`,
    [fixture.brandId, fixture.merchantId, `BR-${fixture.brandId}`],
  );
  await client.query(
    `INSERT INTO "store" (
      "id", "merchant_id", "brand_id", "store_code", "name", "address",
      "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, 'Test Store', 'Local', 'ACTIVE', now())`,
    [
      fixture.storeId,
      fixture.merchantId,
      fixture.brandId,
      `ST-${fixture.storeId}`,
    ],
  );
  await client.query(
    `INSERT INTO "role" (
      "id", "merchant_id", "role_code", "name", "updated_at"
    ) VALUES ($1, $2, $3, 'Test Role', now())`,
    [fixture.roleId, fixture.merchantId, `ROLE-${fixture.roleId}`],
  );
  await client.query(
    `INSERT INTO "staff" (
      "id", "merchant_id", "primary_store_id", "role_id", "staff_code",
      "display_name", "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, 'Test Staff', 'ACTIVE', now())`,
    [
      fixture.staffId,
      fixture.merchantId,
      fixture.storeId,
      fixture.roleId,
      `STAFF-${fixture.staffId}`,
    ],
  );
  await client.query(
    `INSERT INTO "consumer" ("id", "status", "updated_at")
     VALUES ($1, 'ACTIVE', now())`,
    [fixture.consumerId],
  );
  await client.query(
    `INSERT INTO "mini_program_account" (
      "id", "merchant_id", "brand_id", "app_id", "authorization_status",
      "development_status", "audit_status", "release_status", "overall_status",
      "updated_at"
    ) VALUES ($1, $2, $3, $4, 'ACTIVE', 'READY', 'NONE', 'NONE', 'ACTIVE', now())`,
    [
      fixture.miniProgramAccountId,
      fixture.merchantId,
      fixture.brandId,
      `wx${fixture.miniProgramAccountId.replaceAll('-', '')}`,
    ],
  );
  await client.query(
    `INSERT INTO "payment_account" (
      "id", "merchant_id", "brand_id", "mini_program_account_id", "provider",
      "sp_mchid", "sub_appid", "onboarding_status", "appid_binding_status",
      "payment_permission_status", "status", "credential_ref", "updated_at"
    ) VALUES ($1, $2, $3, $4, 'WECHAT_PAY', $5, $6, 'ACTIVE', 'BOUND',
      'ACTIVE', 'ACTIVE', $7, now())`,
    [
      fixture.paymentAccountId,
      fixture.merchantId,
      fixture.brandId,
      fixture.miniProgramAccountId,
      `sp-${fixture.paymentAccountId}`,
      `wx${fixture.miniProgramAccountId.replaceAll('-', '')}`,
      `secret-ref-${fixture.paymentAccountId}`,
    ],
  );
  await client.query(
    `INSERT INTO "product" (
      "id", "merchant_id", "brand_id", "product_code", "product_type",
      "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, 'GROUP_BUY', 'DRAFT', now())`,
    [
      fixture.productId,
      fixture.merchantId,
      fixture.brandId,
      `PROD-${fixture.productId}`,
    ],
  );
  await client.query(
    `INSERT INTO "product_version" (
      "id", "product_id", "merchant_id", "version_no", "title", "status",
      "updated_at"
    ) VALUES ($1, $2, $3, 1, 'Test Product', 'DRAFT', now())`,
    [fixture.productVersionId, fixture.productId, fixture.merchantId],
  );
  await client.query(
    `INSERT INTO "group_buy_campaign" (
      "id", "merchant_id", "brand_id", "product_id", "campaign_code",
      "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', now())`,
    [
      fixture.campaignId,
      fixture.merchantId,
      fixture.brandId,
      fixture.productId,
      `CAM-${fixture.campaignId}`,
    ],
  );
  await client.query(
    `INSERT INTO "group_buy_campaign_version" (
      "id", "campaign_id", "merchant_id", "product_version_id", "version_no",
      "reference_price", "sale_price", "currency", "sale_start_at",
      "sale_end_at", "store_scope", "refund_policy_code", "expiry_policy_code",
      "reservation_required", "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, 1, 200, 100, 'CNY', now(),
      now() + interval '30 days', 'ALL', 'DEFAULT', 'DEFAULT', false, 'DRAFT', now())`,
    [
      fixture.campaignVersionId,
      fixture.campaignId,
      fixture.merchantId,
      fixture.productVersionId,
    ],
  );
  await client.query(
    `INSERT INTO "inventory" (
      "id", "merchant_id", "campaign_id", "inventory_mode", "inventory_scope",
      "total_stock", "reserved_stock", "sold_stock", "updated_at"
    ) VALUES ($1, $2, $3, 'LIMITED', 'CAMPAIGN', 10, 0, 0, now())`,
    [fixture.inventoryId, fixture.merchantId, fixture.campaignId],
  );
  await insertOrder(client, fixture, fixture.orderId);
  await client.query(
    `INSERT INTO "order_item" (
      "id", "order_id", "merchant_id", "product_id", "product_version_id",
      "campaign_id", "campaign_version_id", "product_name_snapshot",
      "unit_price_snapshot", "quantity", "subtotal_amount",
      "package_snapshot_json", "usage_rule_snapshot_json",
      "refund_policy_snapshot_json", "expiry_policy_snapshot_json"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Test Product', 100, 2, 200,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`,
    [
      fixture.orderItemId,
      fixture.orderId,
      fixture.merchantId,
      fixture.productId,
      fixture.productVersionId,
      fixture.campaignId,
      fixture.campaignVersionId,
    ],
  );

  return fixture;
}

beforeAll(async () => {
  const result = await pool.query('SELECT current_database() AS database');
  expect(result.rows[0].database).toBe('saas_test');
});

afterAll(async () => {
  await pool.end();
});

describe('PostgreSQL migration baseline', () => {
  it('accepts a valid tenant-scoped relation chain', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const result = await client.query(
        'SELECT merchant_id FROM "store" WHERE id = $1',
        [fixture.storeId],
      );
      expect(result.rows[0].merchant_id).toBe(fixture.merchantId);
    });
  });

  it('rejects a cross-tenant Brand-to-Store relation', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const otherMerchantId = randomUUID();
      const otherBrandId = randomUUID();
      await client.query(
        `INSERT INTO "merchant" (
          "id", "merchant_code", "display_name", "legal_entity_name",
          "contact_name", "contact_phone", "status", "updated_at"
        ) VALUES ($1, $2, 'Other', 'Other', 'Other', '0', 'ACTIVE', now())`,
        [otherMerchantId, `MER-${otherMerchantId}`],
      );
      await client.query(
        `INSERT INTO "brand" (
          "id", "merchant_id", "brand_code", "name", "status", "updated_at"
        ) VALUES ($1, $2, $3, 'Other', 'ACTIVE', now())`,
        [otherBrandId, otherMerchantId, `BR-${otherBrandId}`],
      );
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "store" (
            "id", "merchant_id", "brand_id", "store_code", "name", "address",
            "status", "updated_at"
          ) VALUES ($1, $2, $3, $4, 'Invalid', 'Local', 'ACTIVE', now())`,
          [randomUUID(), fixture.merchantId, otherBrandId, randomUUID()],
        ),
        '23503',
      );
    });
  });

  it('rejects duplicate business keys', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "merchant" (
            "id", "merchant_code", "display_name", "legal_entity_name",
            "contact_name", "contact_phone", "status", "updated_at"
          ) SELECT $1, "merchant_code", 'Duplicate', 'Duplicate', 'Duplicate',
            '0', 'ACTIVE', now() FROM "merchant" WHERE "id" = $2`,
          [randomUUID(), fixture.merchantId],
        ),
        '23505',
      );
    });
  });

  it('allows only one effective successful Payment per Order', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      await insertPayment(client, fixture, {
        status: 'SUCCESS',
        effective: true,
      });
      await expectDatabaseRejection(
        insertPayment(client, fixture, { status: 'SUCCESS', effective: true }),
        '23505',
      );
    });
  });

  it('keeps Payment SUCCESS immutable', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const paymentId = await insertPayment(client, fixture, {
        status: 'SUCCESS',
        effective: true,
      });
      await expectDatabaseRejection(
        client.query(
          'UPDATE "payment" SET "status" = \'FAILED\' WHERE id = $1',
          [paymentId],
        ),
        'P0001',
      );
    });
  });

  it('rejects duplicate Voucher sequence numbers', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      await insertVoucher(client, fixture, 1);
      await expectDatabaseRejection(insertVoucher(client, fixture, 1), '23505');
    });
  });

  it('rejects a second successful Redemption for one Voucher', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const voucherId = await insertVoucher(client, fixture);
      const insertRedemption = () => {
        const redemptionId = randomUUID();
        return client.query(
          `INSERT INTO "redemption" (
            "id", "redemption_no", "merchant_id", "voucher_id", "order_id",
            "store_id", "staff_id", "redeem_method", "status", "request_id",
            "idempotency_key"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'QR', 'SUCCESS', $8, $9)`,
          [
            redemptionId,
            `RED-${redemptionId}`,
            fixture.merchantId,
            voucherId,
            fixture.orderId,
            fixture.storeId,
            fixture.staffId,
            `request-${redemptionId}`,
            `redemption-${redemptionId}`,
          ],
        );
      };
      await insertRedemption();
      await expectDatabaseRejection(insertRedemption(), '23505');
    });
  });

  it('rejects a Refund linked to a Payment from another Order', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const paymentId = await insertPayment(client, fixture);
      const otherOrderId = await insertOrder(client, fixture);
      await expectDatabaseRejection(
        insertRefund(client, fixture, paymentId, { orderId: otherOrderId }),
        '23503',
      );
    });
  });

  it('rejects an illegal Inventory state', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      await expectDatabaseRejection(
        client.query(
          `UPDATE "inventory"
           SET "reserved_stock" = 9, "sold_stock" = 2
           WHERE "id" = $1`,
          [fixture.inventoryId],
        ),
        '23514',
      );
    });
  });

  it('allows only one active MiniProgramAuthorization per account', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const insertAuthorization = () =>
        client.query(
          `INSERT INTO "mini_program_authorization" (
            "id", "mini_program_account_id", "authorization_status",
            "authorization_scope_json", "credential_ref", "authorized_at"
          ) VALUES ($1, $2, 'ACTIVE', '{}'::jsonb, $3, now())`,
          [
            randomUUID(),
            fixture.miniProgramAccountId,
            `secret-ref-${randomUUID()}`,
          ],
        );
      await insertAuthorization();
      await expectDatabaseRejection(insertAuthorization(), '23505');
    });
  });

  it('serializes and rejects Refund allocation above Payment amount', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      const paymentId = await insertPayment(client, fixture, {
        status: 'SUCCESS',
        effective: true,
        amount: 200,
      });
      await insertRefund(client, fixture, paymentId, {
        amount: 150,
        status: 'APPROVED',
      });
      await expectDatabaseRejection(
        insertRefund(client, fixture, paymentId, {
          amount: 100,
          status: 'APPROVED',
        }),
        'P0001',
      );
    });
  });

  it('rejects physical deletion of core transaction facts', async () => {
    await withRollback(async (client) => {
      const fixture = await createFixture(client);
      await expectDatabaseRejection(
        client.query('DELETE FROM "orders" WHERE id = $1', [fixture.orderId]),
        'P0001',
      );
    });
  });

  it('commits a database transaction', async () => {
    const client = await pool.connect();
    const scopeId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "feature_flag" (
          "id", "scope_type", "scope_id", "feature_code", "enabled"
        ) VALUES ($1, 'TEST', $2, 'transaction.commit', true)`,
        [randomUUID(), scopeId],
      );
      await client.query('COMMIT');
      const result = await client.query(
        'SELECT count(*)::int AS count FROM "feature_flag" WHERE "scope_id" = $1',
        [scopeId],
      );
      expect(result.rows[0].count).toBe(1);
      await client.query('DELETE FROM "feature_flag" WHERE "scope_id" = $1', [
        scopeId,
      ]);
    } finally {
      client.release();
    }
  });

  it('rolls back a database transaction', async () => {
    const client = await pool.connect();
    const scopeId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "feature_flag" (
          "id", "scope_type", "scope_id", "feature_code", "enabled"
        ) VALUES ($1, 'TEST', $2, 'transaction.rollback', true)`,
        [randomUUID(), scopeId],
      );
      await client.query('ROLLBACK');
      const result = await client.query(
        'SELECT count(*)::int AS count FROM "feature_flag" WHERE "scope_id" = $1',
        [scopeId],
      );
      expect(result.rows[0].count).toBe(0);
    } finally {
      client.release();
    }
  });
});
