import 'dotenv/config';

import pg from 'pg';

import {
  platformManagementPermissions,
  platformReviewerPermissions,
  registeredPlatformPermissions,
} from '../packages/modules/identity-access/dist/index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for RBAC seed.');

const roleIds = {
  PLATFORM_REVIEWER: '00000000-0000-4000-8000-000000000102',
  PLATFORM_SUPER_ADMIN: '00000000-0000-4000-8000-000000000101',
};

function permissionId(index) {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query('BEGIN');

  const permissions = [...registeredPlatformPermissions].sort();
  for (const [index, permissionCode] of permissions.entries()) {
    await client.query(
      `INSERT INTO "permission" ("id", "permission_code", "name", "description")
       VALUES ($1, $2, $3, 'Approved V1 Platform permission')
       ON CONFLICT ("permission_code") DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description"`,
      [permissionId(index), permissionCode, permissionCode],
    );
  }

  for (const [roleCode, roleId] of Object.entries(roleIds)) {
    await client.query(
      `INSERT INTO "role" (
        "id", "merchant_id", "role_code", "name", "description", "updated_at"
      ) VALUES ($1, NULL, $2, $3, 'Approved V1 system role', now())
      ON CONFLICT ("role_code") WHERE "merchant_id" IS NULL DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "updated_at" = now()`,
      [roleId, roleCode, roleCode],
    );
  }

  await client.query(
    `DELETE FROM "role_permission" rp
     USING "role" r, "permission" p
     WHERE rp."role_id" = r."id"
       AND rp."permission_id" = p."id"
       AND r."merchant_id" IS NULL
       AND r."role_code" = 'PLATFORM_REVIEWER'
       AND p."permission_code" = ANY($1::text[])
       AND NOT (p."permission_code" = ANY($2::text[]))`,
    [platformManagementPermissions, platformReviewerPermissions],
  );

  await client.query(
    `DELETE FROM "role_permission" rp
     USING "role" r, "permission" p
     WHERE rp."role_id" = r."id"
       AND rp."permission_id" = p."id"
       AND r."merchant_id" IS NOT NULL
       AND r."role_code" IN ('MERCHANT_ADMIN', 'MERCHANT_STAFF')
       AND p."permission_code" = ANY($1::text[])`,
    [platformManagementPermissions],
  );

  for (const permissionCode of platformReviewerPermissions) {
    await client.query(
      `INSERT INTO "role_permission" ("role_id", "permission_id")
       SELECT r."id", p."id"
       FROM "role" r, "permission" p
       WHERE r."merchant_id" IS NULL
         AND r."role_code" = 'PLATFORM_REVIEWER'
         AND p."permission_code" = $1
       ON CONFLICT DO NOTHING`,
      [permissionCode],
    );
  }

  await client.query('COMMIT');
  console.log('Platform RBAC baseline seed applied.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
