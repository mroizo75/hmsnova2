-- Filnøkler er tenant/mappe/tidsstempel/filnavn. Flere kursbevis lagres som JSON i proofDocKey.
-- VARCHAR(191) avviste lagring når ett kurs hadde mer enn ett dokument.

ALTER TABLE `Training` MODIFY `proofDocKey` TEXT NULL;
ALTER TABLE `Document` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `DocumentVersion` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `ElectroComplianceDeclaration` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `ElectroInstruction` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `SecurityEvidence` MODIFY `attachmentKey` TEXT NULL;
ALTER TABLE `EnvironmentalMeasurement` MODIFY `attachmentKey` TEXT NULL;
ALTER TABLE `Chemical` MODIFY `sdsKey` TEXT NULL;
ALTER TABLE `Attachment` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `FormFieldValue` MODIFY `fileKey` TEXT NULL;
ALTER TABLE `CorporateGroupContent` MODIFY `fileKey` TEXT NULL;
ALTER TABLE `PersonnelDocument` MODIFY `fileKey` TEXT NOT NULL;
ALTER TABLE `EquipmentApprovalDocument` MODIFY `fileKey` TEXT NOT NULL;

SET @has_checklist_photo := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND LOWER(TABLE_NAME) = 'checklistanswerphoto'
);
SET @checklist_photo_sql := IF(
  @has_checklist_photo > 0,
  'ALTER TABLE `ChecklistAnswerPhoto` MODIFY `fileKey` TEXT NOT NULL',
  'SELECT 1'
);
PREPARE checklist_photo_stmt FROM @checklist_photo_sql;
EXECUTE checklist_photo_stmt;
DEALLOCATE PREPARE checklist_photo_stmt;
