-- Admin kan beholde tilgangen uten å motta varsler (f.eks. IT).
ALTER TABLE `UserTenant`
  ADD COLUMN `notificationsMuted` BOOLEAN NOT NULL DEFAULT false;
