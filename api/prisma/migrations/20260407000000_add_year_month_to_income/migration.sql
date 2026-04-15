-- AlterTable: add year and month columns to Income.
-- PostgreSQL does not allow column references in DEFAULT expressions, so we:
--   1. Add the columns as nullable
--   2. Backfill existing rows from their createdAt timestamp (falls back to
--      CURRENT_DATE when createdAt is NULL)
--   3. Make the columns NOT NULL now that every row has a value

-- Step 1: add as nullable
ALTER TABLE "Income"
  ADD COLUMN "year"  INTEGER,
  ADD COLUMN "month" INTEGER;

-- Step 2: backfill from createdAt so each historical row reflects its original month
UPDATE "Income"
  SET "year"  = EXTRACT(YEAR  FROM COALESCE("createdAt", CURRENT_DATE)),
      "month" = EXTRACT(MONTH FROM COALESCE("createdAt", CURRENT_DATE));

-- Step 3: enforce NOT NULL now that all rows have values
ALTER TABLE "Income"
  ALTER COLUMN "year"  SET NOT NULL,
  ALTER COLUMN "month" SET NOT NULL;
