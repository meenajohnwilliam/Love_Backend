/*
  Warnings:

  - You are about to drop the column `userId` on the `Form` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_userId_fkey";

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "userId";
