-- Manuell fakturasjekk inntil Fiken, og standardabonnement på bedrifter som mangler det
ALTER TABLE `Tenant`
  ADD COLUMN `manualInvoiced` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `manualInvoicedAt` DATETIME(3) NULL;

INSERT INTO `Subscription` (
  `id`,
  `tenantId`,
  `plan`,
  `status`,
  `price`,
  `billingInterval`,
  `currentPeriodStart`,
  `currentPeriodEnd`,
  `cancelAtPeriodEnd`,
  `createdAt`,
  `updatedAt`
)
SELECT
  REPLACE(UUID(), '-', ''),
  t.`id`,
  'PROFESSIONAL',
  CASE WHEN t.`status` = 'TRIAL' THEN 'TRIAL' ELSE 'ACTIVE' END,
  3600,
  'YEARLY',
  NOW(3),
  DATE_ADD(NOW(3), INTERVAL 1 YEAR),
  false,
  NOW(3),
  NOW(3)
FROM `Tenant` t
LEFT JOIN `Subscription` s ON s.`tenantId` = t.`id`
WHERE s.`id` IS NULL
  AND t.`status` IN ('TRIAL', 'ACTIVE');
