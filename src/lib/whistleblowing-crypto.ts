import { encryptField, decryptField, isEncrypted } from "@/lib/field-encryption";

function encryptMaybe(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encryptField(value);
}

function decryptMaybe(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;
  return decryptField(value);
}

export function encryptWhistleblowIdentity(input: {
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
}) {
  return {
    reporterName: encryptMaybe(input.reporterName),
    reporterEmail: encryptMaybe(input.reporterEmail),
    reporterPhone: encryptMaybe(input.reporterPhone),
  };
}

export function decryptWhistleblowIdentity(input: {
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
}) {
  return {
    reporterName: decryptMaybe(input.reporterName),
    reporterEmail: decryptMaybe(input.reporterEmail),
    reporterPhone: decryptMaybe(input.reporterPhone),
  };
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret);
}

export function decryptTotpSecret(stored: string): string {
  return isEncrypted(stored) ? decryptField(stored) : stored;
}
