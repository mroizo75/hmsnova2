-- Valgfri lesebekreftelse på opplastede dokumenter (IK-HMS § 5).

ALTER TABLE `Document`
  ADD COLUMN `requiresReadConfirmation` BOOLEAN NOT NULL DEFAULT false;
