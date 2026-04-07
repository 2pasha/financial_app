-- AlterTable: add year and month columns to Income.
-- Existing rows are backfilled from their createdAt timestamp so each historical
-- row reflects the month it was originally recorded in.
-- Falls back to CURRENT_DATE if createdAt is somehow NULL.
ALTER TABLE "Income"
  ADD COLUMN "year"  INTEGER NOT NULL DEFAULT EXTRACT(YEAR  FROM COALESCE("createdAt", CURRENT_DATE)),
  ADD COLUMN "month" INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM COALESCE("createdAt", CURRENT_DATE));

-- Remove the defaults so new rows must always supply explicit values.
ALTER TABLE "Income"
  ALTER COLUMN "year"  DROP DEFAULT,
  ALTER COLUMN "month" DROP DEFAULT;
