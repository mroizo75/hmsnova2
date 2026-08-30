-- Personalhåndbok: kategori på håndbokseksjoner (HMS | HR)
-- Eksisterende seksjoner får HMS via DEFAULT.

ALTER TABLE `HandbookSection`
  ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'HMS';
