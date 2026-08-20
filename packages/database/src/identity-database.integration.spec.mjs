import { randomBytes, randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required.');

const parsedDatabaseUrl = new URL(testDatabaseUrl);
if (
  !new Set(['127.0.0.1', 'localhost', '::1', '[::1]']).has(
    parsedDatabaseUrl.hostname,
  ) ||
  parsedDatabaseUrl.pathname !== '/saas_test'
) {
  throw new Error(
    'Identity integration tests may only use the local saas_test database.',
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

async function createMerchantFixture(client, label) {
  const fixture = {
    merchantId: randomUUID(),
    brandId: randomUUID(),
    storeIds: [randomUUID(), randomUUID()],
    roleId: randomUUID(),
    staffId: randomUUID(),
    consumerId: randomUUID(),
  };

  await client.query(
    `INSERT INTO "merchant" (
      "id", "merchant_code", "display_name", "legal_entity_name",
      "contact_name", "contact_phone", "status", "updated_at"
    ) VALUES ($1, $2, $3, $3, 'Test Contact', '00000000000', 'ACTIVE', now())`,
    [fixture.merchantId, `MER-${fixture.merchantId}`, `Test Merchant ${label}`],
  );
  await client.query(
    `INSERT INTO "brand" (
      "id", "merchant_id", "brand_code", "name", "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
    [
      fixture.brandId,
      fixture.merchantId,
      `BR-${fixture.brandId}`,
      `Brand ${label}`,
    ],
  );
  for (const storeId of fixture.storeIds) {
    await client.query(
      `INSERT INTO "store" (
        "id", "merchant_id", "brand_id", "store_code", "name", "address",
        "status", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, 'Test Address', 'ACTIVE', now())`,
      [
        storeId,
        fixture.merchantId,
        fixture.brandId,
        `ST-${storeId}`,
        `Store ${label}`,
      ],
    );
  }
  await client.query(
    `INSERT INTO "role" (
      "id", "merchant_id", "role_code", "name", "updated_at"
    ) VALUES ($1, $2, 'MERCHANT_STAFF', 'Merchant Staff', now())`,
    [fixture.roleId, fixture.merchantId],
  );
  await client.query(
    `INSERT INTO "staff" (
      "id", "merchant_id", "primary_store_id", "role_id", "staff_code",
      "display_name", "status", "updated_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', now())`,
    [
      fixture.staffId,
      fixture.merchantId,
      fixture.storeIds[0],
      fixture.roleId,
      `STAFF-${fixture.staffId}`,
      `Staff ${label}`,
    ],
  );
  await client.query(
    `INSERT INTO "consumer" ("id", "status", "updated_at")
     VALUES ($1, 'ACTIVE', now())`,
    [fixture.consumerId],
  );

  return fixture;
}

async function createPlatformAdmin(client) {
  const roleId = randomUUID();
  const platformAdminId = randomUUID();
  await client.query(
    `INSERT INTO "role" ("id", "role_code", "name", "updated_at")
     VALUES ($1, 'PLATFORM_REVIEWER', 'Platform Reviewer', now())`,
    [roleId],
  );
  await client.query(
    `INSERT INTO "platform_admin" (
      "id", "admin_code", "display_name", "status", "role_id", "updated_at"
    ) VALUES ($1, $2, 'Test Platform Admin', 'ACTIVE', $3, now())`,
    [platformAdminId, `ADMIN-${platformAdminId}`, roleId],
  );
  return { platformAdminId, roleId };
}

async function insertSession(
  client,
  actorType,
  actorId,
  tokenHash = randomBytes(32).toString('hex'),
) {
  const columns = {
    CONSUMER: 'consumer_id',
    STAFF: 'staff_id',
    PLATFORM: 'platform_admin_id',
  };
  await client.query(
    `INSERT INTO "auth_session" (
      "id", "actor_type", "${columns[actorType]}", "token_hash", "status",
      "permission_version_snapshot", "issued_at", "expires_at", "updated_at"
    ) VALUES ($1, $2, $3, $4, 'ACTIVE', 1, now(), now() + interval '1 hour', now())`,
    [randomUUID(), actorType, actorId, tokenHash],
  );
  return tokenHash;
}

describe('Identity, tenant and RBAC database foundation', () => {
  afterAll(async () => pool.end());

  it('binds one Staff to one Store', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      await client.query(
        `INSERT INTO "staff_store_assignment" (
          "id", "merchant_id", "staff_id", "store_id", "status", "updated_at"
        ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
        [
          randomUUID(),
          fixture.merchantId,
          fixture.staffId,
          fixture.storeIds[0],
        ],
      );
    });
  });

  it('binds one Staff to multiple Stores', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      for (const storeId of fixture.storeIds) {
        await client.query(
          `INSERT INTO "staff_store_assignment" (
            "id", "merchant_id", "staff_id", "store_id", "status", "updated_at"
          ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
          [randomUUID(), fixture.merchantId, fixture.staffId, storeId],
        );
      }
      const result = await client.query(
        `SELECT count(*)::int AS count FROM "staff_store_assignment"
         WHERE "staff_id" = $1 AND "status" = 'ACTIVE'`,
        [fixture.staffId],
      );
      expect(result.rows[0].count).toBe(2);
    });
  });

  it('rejects a duplicate Staff and Store assignment', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      const values = [fixture.merchantId, fixture.staffId, fixture.storeIds[0]];
      await client.query(
        `INSERT INTO "staff_store_assignment" (
          "id", "merchant_id", "staff_id", "store_id", "status", "updated_at"
        ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
        [randomUUID(), ...values],
      );
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "staff_store_assignment" (
            "id", "merchant_id", "staff_id", "store_id", "status", "updated_at"
          ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
          [randomUUID(), ...values],
        ),
        '23505',
      );
    });
  });

  it('rejects a cross-tenant Staff and Store assignment', async () => {
    await withRollback(async (client) => {
      const tenantA = await createMerchantFixture(client, 'A');
      const tenantB = await createMerchantFixture(client, 'B');
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "staff_store_assignment" (
            "id", "merchant_id", "staff_id", "store_id", "status", "updated_at"
          ) VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
          [
            randomUUID(),
            tenantA.merchantId,
            tenantA.staffId,
            tenantB.storeIds[0],
          ],
        ),
        '23503',
      );
    });
  });

  it('persists a PlatformAdmin without merchant ownership', async () => {
    await withRollback(async (client) => {
      const { platformAdminId } = await createPlatformAdmin(client);
      const result = await client.query(
        `SELECT p."id", r."merchant_id"
         FROM "platform_admin" p JOIN "role" r ON r."id" = p."role_id"
         WHERE p."id" = $1`,
        [platformAdminId],
      );
      expect(result.rows[0]).toMatchObject({
        id: platformAdminId,
        merchant_id: null,
      });
    });
  });

  it('rejects a Merchant Role for a PlatformAdmin', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "platform_admin" (
            "id", "admin_code", "display_name", "status", "role_id", "updated_at"
          ) VALUES ($1, $2, 'Invalid Admin', 'ACTIVE', $3, now())`,
          [randomUUID(), `ADMIN-${randomUUID()}`, fixture.roleId],
        ),
        '23514',
      );
    });
  });

  it('enforces PlatformAdminIdentity provider-subject uniqueness', async () => {
    await withRollback(async (client) => {
      const { platformAdminId } = await createPlatformAdmin(client);
      const subject = `subject-${randomUUID()}`;
      for (let index = 0; index < 2; index += 1) {
        const insert = client.query(
          `INSERT INTO "platform_admin_identity" (
            "id", "platform_admin_id", "provider", "provider_subject_id",
            "status", "updated_at"
          ) VALUES ($1, $2, 'TEST', $3, 'ACTIVE', now())`,
          [randomUUID(), platformAdminId, subject],
        );
        if (index === 0) await insert;
        else await expectDatabaseRejection(insert, '23505');
      }
    });
  });

  it('accepts a valid STAFF AuthSession shape', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      await insertSession(client, 'STAFF', fixture.staffId);
    });
  });

  it('accepts a valid PLATFORM AuthSession shape', async () => {
    await withRollback(async (client) => {
      const { platformAdminId } = await createPlatformAdmin(client);
      await insertSession(client, 'PLATFORM', platformAdminId);
    });
  });

  it('accepts a valid CONSUMER AuthSession shape', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      await insertSession(client, 'CONSUMER', fixture.consumerId);
    });
  });

  it('rejects an AuthSession with multiple Actor foreign keys', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      const { platformAdminId } = await createPlatformAdmin(client);
      await expectDatabaseRejection(
        client.query(
          `INSERT INTO "auth_session" (
            "id", "actor_type", "staff_id", "platform_admin_id", "token_hash",
            "status", "permission_version_snapshot", "issued_at", "expires_at", "updated_at"
          ) VALUES ($1, 'STAFF', $2, $3, $4, 'ACTIVE', 1, now(),
            now() + interval '1 hour', now())`,
          [
            randomUUID(),
            fixture.staffId,
            platformAdminId,
            randomBytes(32).toString('hex'),
          ],
        ),
        '23514',
      );
    });
  });

  it('enforces unique session token hashes', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      const tokenHash = await insertSession(client, 'STAFF', fixture.staffId);
      await expectDatabaseRejection(
        insertSession(client, 'STAFF', fixture.staffId, tokenHash),
        '23505',
      );
    });
  });

  it('has no raw session token column', async () => {
    await withRollback(async (client) => {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'auth_session'
           AND column_name IN ('token', 'raw_token', 'session_token')`,
      );
      expect(result.rowCount).toBe(0);
    });
  });

  it('supports invalidating an old Session by permission version', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      await insertSession(client, 'STAFF', fixture.staffId);
      await client.query(
        `UPDATE "staff" SET "permission_version" = "permission_version" + 1,
          "updated_at" = now() WHERE "id" = $1`,
        [fixture.staffId],
      );
      const result = await client.query(
        `SELECT s."permission_version_snapshot" <> a."permission_version" AS invalidated
         FROM "auth_session" s JOIN "staff" a ON a."id" = s."staff_id"
         WHERE s."staff_id" = $1`,
        [fixture.staffId],
      );
      expect(result.rows[0].invalidated).toBe(true);
    });
  });

  it('supports data-driven initial role permission mappings', async () => {
    await withRollback(async (client) => {
      const fixture = await createMerchantFixture(client, 'A');
      const permissionId = randomUUID();
      await client.query(
        `INSERT INTO "permission" ("id", "permission_code", "name")
         VALUES ($1, 'voucher.redeem', 'Redeem Voucher')`,
        [permissionId],
      );
      await client.query(
        `INSERT INTO "role_permission" ("role_id", "permission_id") VALUES ($1, $2)`,
        [fixture.roleId, permissionId],
      );
      const result = await client.query(
        `SELECT p."permission_code" FROM "role_permission" rp
         JOIN "permission" p ON p."id" = rp."permission_id"
         WHERE rp."role_id" = $1`,
        [fixture.roleId],
      );
      expect(result.rows).toEqual([{ permission_code: 'voucher.redeem' }]);
    });
  });
});
