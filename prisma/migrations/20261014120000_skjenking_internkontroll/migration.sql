-- Internkontroll skjenking: alkoholforskriften § 8-3 nr. 1–6.

ALTER TABLE `SkjenkeBevilling`
  ADD COLUMN `bevillingstype` VARCHAR(191) NOT NULL DEFAULT 'SKJENKING',
  ADD COLUMN `ambulerende` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `gruppe1` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `gruppe2` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `gruppe3` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `styrerProveDato` DATETIME(3) NULL,
  ADD COLUMN `stedfortrederProveDato` DATETIME(3) NULL,
  ADD COLUMN `alderskontrollAnsvar` VARCHAR(191) NULL,
  ADD COLUMN `beruselseAnsvar` VARCHAR(191) NULL,
  ADD COLUMN `bortvisningAnsvar` VARCHAR(191) NULL,
  ADD COLUMN `opplaeringAnsvar` VARCHAR(191) NULL,
  ADD COLUMN `alkoholfrittUtvalg` TEXT NULL,
  ADD COLUMN `harHalvflasker` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `harMinibar` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `sarvilkar` TEXT NULL,
  ADD COLUMN `sistOmsetningsoppgave` DATETIME(3) NULL,
  ADD COLUMN `nesteGjennomgang` DATETIME(3) NULL;

ALTER TABLE `SkjenkeHendelse`
  ADD COLUMN `korrigerendeTiltak` TEXT NULL,
  ADD COLUMN `forebygging` TEXT NULL,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'LUKKET',
  ADD COLUMN `lukketAt` DATETIME(3) NULL;

CREATE TABLE `SkjenkeRutine` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `nokkel` VARCHAR(191) NOT NULL,
  `tittel` VARCHAR(191) NOT NULL,
  `lovhjemmel` VARCHAR(191) NOT NULL,
  `innhold` TEXT NOT NULL,
  `aktiv` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `SkjenkeRutine_tenantId_nokkel_key` ON `SkjenkeRutine`(`tenantId`, `nokkel`);
CREATE INDEX `SkjenkeRutine_tenantId_idx` ON `SkjenkeRutine`(`tenantId`);
ALTER TABLE `SkjenkeRutine` ADD CONSTRAINT `SkjenkeRutine_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `SkjenkeGjennomgang` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `gjennomfortAt` DATETIME(3) NOT NULL,
  `gjennomfortAv` VARCHAR(191) NOT NULL,
  `funn` TEXT NOT NULL,
  `tiltak` TEXT NULL,
  `nesteDato` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `SkjenkeGjennomgang_tenantId_idx` ON `SkjenkeGjennomgang`(`tenantId`);
CREATE INDEX `SkjenkeGjennomgang_gjennomfortAt_idx` ON `SkjenkeGjennomgang`(`gjennomfortAt`);
ALTER TABLE `SkjenkeGjennomgang` ADD CONSTRAINT `SkjenkeGjennomgang_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
