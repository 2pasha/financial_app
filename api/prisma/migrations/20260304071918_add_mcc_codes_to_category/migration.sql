-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "mccCodes" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
