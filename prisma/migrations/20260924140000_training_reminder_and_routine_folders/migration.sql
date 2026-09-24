-- Kompetansevarsel: bedriften velger dager før utløp (AML § 3-2)
ALTER TABLE `Tenant` ADD COLUMN `trainingReminderDaysBefore` INTEGER NOT NULL DEFAULT 30;

CREATE TABLE `RoutineFolder` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RoutineFolder_tenantId_name_key`(`tenantId`, `name`),
    INDEX `RoutineFolder_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RoutineFolder`
  ADD CONSTRAINT `RoutineFolder_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Routine` ADD COLUMN `folderId` VARCHAR(191) NULL;
ALTER TABLE `Routine` ADD COLUMN `documentKind` ENUM('RUTINE', 'PROSEDYRE') NOT NULL DEFAULT 'RUTINE';

CREATE INDEX `Routine_folderId_idx` ON `Routine`(`folderId`);

ALTER TABLE `Routine`
  ADD CONSTRAINT `Routine_folderId_fkey`
  FOREIGN KEY (`folderId`) REFERENCES `RoutineFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `RoutineFolder` (`id`, `tenantId`, `name`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('rf_', SUBSTRING(MD5(CONCAT(`tenantId`, ':', `category`)), 1, 24)),
  `tenantId`,
  CASE `category`
    WHEN 'AVVIK' THEN 'Avvik og korrigerende tiltak'
    WHEN 'VARSLING' THEN 'Varsling'
    WHEN 'BRANN' THEN 'Brannvern'
    WHEN 'HMS_STYRING' THEN 'HMS-styring og system'
    WHEN 'EL_SIKKERHET' THEN 'Elektrisk sikkerhet'
    WHEN 'BYGG_ANLEGG' THEN 'Bygg og anlegg'
    WHEN 'HELSE' THEN 'Helse og miljø'
    WHEN 'TRANSPORT' THEN 'Transport og logistikk'
    WHEN 'INDUSTRI' THEN 'Industri og produksjon'
    WHEN 'HANDEL_SERVICE' THEN 'Handel og service'
    WHEN 'HOTELL_RESTAURANT' THEN 'Hotell og restaurant'
    WHEN 'UTDANNING' THEN 'Utdanning'
    WHEN 'TEKNOLOGI_IT' THEN 'Teknologi og IT'
    WHEN 'LANDBRUK' THEN 'Landbruk'
    WHEN 'GENERELL' THEN 'Generell HMS'
    WHEN 'KJEMIKALIER' THEN 'Kjemikalier'
    WHEN 'ARBEIDSTID' THEN 'Arbeidstid'
    WHEN 'MAT_SERVERING' THEN 'Mat og servering'
    WHEN 'VOLD_TRUSLER' THEN 'Vold og trusler'
    WHEN 'ALENEARBEID' THEN 'Alenearbeid'
    WHEN 'PERSONVERN' THEN 'Personvern'
    WHEN 'MILJO' THEN 'Ytre miljø'
    WHEN 'BILVERKSTED' THEN 'Bilverksted – HMS'
    WHEN 'KVALITET_SVV' THEN 'Kvalitet (Statens vegvesen)'
    ELSE `category`
  END,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Routine`
WHERE `category` IS NOT NULL AND TRIM(`category`) <> ''
GROUP BY `tenantId`, `category`;

UPDATE `Routine` AS r
INNER JOIN `RoutineFolder` AS f
  ON f.`id` = CONCAT('rf_', SUBSTRING(MD5(CONCAT(r.`tenantId`, ':', r.`category`)), 1, 24))
SET r.`folderId` = f.`id`
WHERE r.`category` IS NOT NULL AND TRIM(r.`category`) <> '';
