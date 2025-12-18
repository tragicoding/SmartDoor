/*
  Warnings:

  - A unique constraint covering the columns `[serial]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serial` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Device` DROP FOREIGN KEY `Device_user_id_fkey`;

-- DropIndex
DROP INDEX `Device_user_id_fkey` ON `Device`;

-- AlterTable
ALTER TABLE `Device` ADD COLUMN `serial` VARCHAR(191) NOT NULL,
    MODIFY `user_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Device_serial_key` ON `Device`(`serial`);

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
