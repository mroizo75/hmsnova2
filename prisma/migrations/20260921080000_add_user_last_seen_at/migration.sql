ALTER TABLE `User` ADD COLUMN `lastSeenAt` DATETIME(3) NULL;
CREATE INDEX `User_lastSeenAt_idx` ON `User`(`lastSeenAt`);
