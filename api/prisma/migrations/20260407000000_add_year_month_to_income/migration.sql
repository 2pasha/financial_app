-- AlterTable: add year and month columns to Income.
-- Existing rows are assigned to the current calendar month so the data stays valid.
ALTER TABLE "Income"
  ADD COLUMN "year"  INTEGER NOT NULL DEFAULT EXTRACT(YEAR  FROM CURRENT_DATE),
  ADD COLUMN "month" INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);

-- Remove the defaults so new rows must always supply explicit values.
ALTER TABLE "Income"
  ALTER COLUMN "year"  DROP DEFAULT,
  ALTER COLUMN "month" DROP DEFAULT;
