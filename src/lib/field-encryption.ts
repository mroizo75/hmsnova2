/**
 * AES-256-GCM feltbasert kryptering for sensitive persondata (f.eks. fødselsnummer).
 *
 * - Hver kryptering genererer unik IV → samme plaintext gir alltid ulikt ciphertext
 * - GCM-modus gir både kryptering og integritetssikring (autentisert kryptering)
 * - Ingen ekstra avhengigheter – bruker Node.js innebygde `crypto`-modul
 *
 * Format som lagres i databasen: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * Eksempel: "a3f1...":"9b2e...":"4c7d..."
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;    // 96-bit IV er anbefalt for GCM
const TAG_BYTES = 16;   // 128-bit auth tag

function getKey(): Buffer {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY mangler eller er ugyldig. Sett en 64-tegns hex-streng (256-bit nøkkel) i .env"
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Krypterer en streng med AES-256-GCM.
 * Returnerer en streng på formatet: <iv>:<authTag>:<ciphertext> (hex-kodet)
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

/**
 * Dekrypterer en streng som tidligere ble kryptert med encryptField.
 * Kaster feil hvis data er manipulert (GCM-autentisering feiler).
 */
export function decryptField(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error("Ugyldig kryptert felt – forventet format <iv>:<authTag>:<ciphertext>");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Sjekk om en verdi allerede er kryptert (inneholder separator-formatet)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === IV_BYTES * 2;
}
