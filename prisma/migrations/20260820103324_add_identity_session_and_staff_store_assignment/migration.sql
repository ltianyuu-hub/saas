-- CreateEnum
CREATE TYPE "StaffStoreAssignmentStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuthSessionActorType" AS ENUM ('CONSUMER', 'STAFF', 'PLATFORM');

-- CreateEnum
CREATE TYPE "AuthSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "staff_store_assignment" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "status" "StaffStoreAssignmentStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_store_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin" (
    "id" UUID NOT NULL,
    "admin_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "PlatformAdminStatus" NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_identity" (
    "id" UUID NOT NULL,
    "platform_admin_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_admin_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" UUID NOT NULL,
    "actor_type" "AuthSessionActorType" NOT NULL,
    "consumer_id" UUID,
    "staff_id" UUID,
    "platform_admin_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "AuthSessionStatus" NOT NULL,
    "permission_version_snapshot" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_store_assignment_merchant_id_staff_id_status_idx" ON "staff_store_assignment"("merchant_id", "staff_id", "status");

-- CreateIndex
CREATE INDEX "staff_store_assignment_merchant_id_store_id_status_idx" ON "staff_store_assignment"("merchant_id", "store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_store_assignment_staff_id_store_id_key" ON "staff_store_assignment"("staff_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_admin_code_key" ON "platform_admin"("admin_code");

-- CreateIndex
CREATE INDEX "platform_admin_status_idx" ON "platform_admin"("status");

-- CreateIndex
CREATE INDEX "platform_admin_identity_platform_admin_id_status_idx" ON "platform_admin_identity"("platform_admin_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_identity_provider_provider_subject_id_key" ON "platform_admin_identity"("provider", "provider_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_hash_key" ON "auth_session"("token_hash");

-- CreateIndex
CREATE INDEX "auth_session_actor_type_status_expires_at_idx" ON "auth_session"("actor_type", "status", "expires_at");

-- CreateIndex
CREATE INDEX "auth_session_consumer_id_status_idx" ON "auth_session"("consumer_id", "status");

-- CreateIndex
CREATE INDEX "auth_session_staff_id_status_idx" ON "auth_session"("staff_id", "status");

-- CreateIndex
CREATE INDEX "auth_session_platform_admin_id_status_idx" ON "auth_session"("platform_admin_id", "status");

-- AddForeignKey
ALTER TABLE "staff_store_assignment" ADD CONSTRAINT "staff_store_assignment_staff_id_merchant_id_fkey" FOREIGN KEY ("staff_id", "merchant_id") REFERENCES "staff"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_store_assignment" ADD CONSTRAINT "staff_store_assignment_store_id_merchant_id_fkey" FOREIGN KEY ("store_id", "merchant_id") REFERENCES "store"("id", "merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin" ADD CONSTRAINT "platform_admin_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_identity" ADD CONSTRAINT "platform_admin_identity_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Approved identity/session invariants that Prisma Schema Language cannot fully express.
ALTER TABLE "platform_admin"
  ADD CONSTRAINT "platform_admin_permission_version_check"
  CHECK ("permission_version" > 0);

ALTER TABLE "auth_session"
  ADD CONSTRAINT "auth_session_actor_shape_check"
  CHECK (
    ("actor_type" = 'STAFF' AND "staff_id" IS NOT NULL AND "platform_admin_id" IS NULL AND "consumer_id" IS NULL)
    OR
    ("actor_type" = 'PLATFORM' AND "platform_admin_id" IS NOT NULL AND "staff_id" IS NULL AND "consumer_id" IS NULL)
    OR
    ("actor_type" = 'CONSUMER' AND "consumer_id" IS NOT NULL AND "staff_id" IS NULL AND "platform_admin_id" IS NULL)
  );

ALTER TABLE "auth_session"
  ADD CONSTRAINT "auth_session_permission_version_check"
  CHECK ("permission_version_snapshot" > 0),
  ADD CONSTRAINT "auth_session_time_range_check"
  CHECK ("expires_at" > "issued_at"),
  ADD CONSTRAINT "auth_session_revoked_at_check"
  CHECK ("status" <> 'REVOKED' OR "revoked_at" IS NOT NULL);

CREATE FUNCTION "assert_platform_admin_role"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "role"
    WHERE "id" = NEW."role_id"
      AND "merchant_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'PlatformAdmin role must be a PLATFORM role'
      USING ERRCODE = '23514', CONSTRAINT = 'platform_admin_platform_role_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "platform_admin_platform_role_check_trigger"
BEFORE INSERT OR UPDATE OF "role_id" ON "platform_admin"
FOR EACH ROW EXECUTE FUNCTION "assert_platform_admin_role"();
