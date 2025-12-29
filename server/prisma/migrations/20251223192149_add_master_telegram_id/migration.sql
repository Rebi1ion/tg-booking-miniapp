/*
  Warnings:

  - A unique constraint covering the columns `[telegram_id]` on the table `Master` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Master" ADD COLUMN "telegram_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Master_telegram_id_key" ON "Master"("telegram_id");
