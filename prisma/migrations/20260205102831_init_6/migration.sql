/*
  Warnings:

  - The values [RADIO,CHECKBOX] on the enum `FieldType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Form` table. All the data in the column will be lost.
  - Added the required column `yourName` to the `Form` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yourSpouseName` to the `Form` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FieldType_new" AS ENUM ('TEXT', 'SELECT');
ALTER TABLE "Field" ALTER COLUMN "type" TYPE "FieldType_new" USING ("type"::text::"FieldType_new");
ALTER TYPE "FieldType" RENAME TO "FieldType_old";
ALTER TYPE "FieldType_new" RENAME TO "FieldType";
DROP TYPE "public"."FieldType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "revealImage" TEXT,
ADD COLUMN     "revealText" TEXT,
ADD COLUMN     "yourName" TEXT NOT NULL,
ADD COLUMN     "yourSpouseName" TEXT NOT NULL;
