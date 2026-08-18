-- Sporing av faktura-eksporter (Excel-nedlastinger)

CREATE TABLE `InvoiceExport` (
    `id` VARCHAR(191) NOT NULL,
    `exportedById` VARCHAR(191) NOT NULL,
    `periodLabel` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `invoiceCount` INTEGER NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `invoiceIds` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `InvoiceExport_createdAt_idx`(`createdAt`),
    INDEX `InvoiceExport_exportedById_idx`(`exportedById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InvoiceExport` ADD CONSTRAINT `InvoiceExport_exportedById_fkey` FOREIGN KEY (`exportedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
