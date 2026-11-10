-- Funn fra vernerundeskjemaet opprettet avvik uten å lagre koblingen.
-- IK-HMS § 5 nr. 6: kartleggingen skal kunne spores tilbake til vernerunden.
UPDATE `InspectionFinding` AS f
INNER JOIN `Inspection` AS ins ON ins.id = f.inspectionId
INNER JOIN `Incident` AS i
  ON i.tenantId = ins.tenantId
 AND i.title = CONCAT('[Vernerunde] ', f.title)
 AND i.description LIKE CONCAT('%', REPLACE(REPLACE(f.description, '%', '\\%'), '_', '\\_'), '%')
 AND ABS(TIMESTAMPDIFF(SECOND, i.createdAt, f.createdAt)) < 180
SET f.linkedIncidentId = i.id
WHERE f.linkedIncidentId IS NULL;
