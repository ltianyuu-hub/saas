-- Align the physical Product type column with the project's snake_case convention.
-- The guard makes this forward migration safe for local databases that were
-- already aligned during DEV-P0-005 verification.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product'
      AND column_name = 'productType'
  ) THEN
    ALTER TABLE "product" RENAME COLUMN "productType" TO "product_type";
  END IF;
END
$$;
