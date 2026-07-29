/**
 * SIKKERHET: Environment Variable Validering
 * 
 * Validerer at alle kritiske miljøvariabler er satt ved oppstart
 * Forhindrer runtime-feil og sikkerhetsproblemer
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // NextAuth
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL?: string;

  // Storage (R2/S3)
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_BUCKET?: string;
  S3_ENDPOINT?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  S3_BUCKET?: string;
  
  // Local storage fallback
  LOCAL_STORAGE_PATH?: string;
  STORAGE_TYPE?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;

  // Rate limiting (Upstash)
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;

  // Azure AD (optional)
  AZURE_AD_CLIENT_ID?: string;
  AZURE_AD_CLIENT_SECRET?: string;
  AZURE_AD_TENANT_ID?: string;
  NEXT_PUBLIC_ENABLE_SSO?: string;

  // SMS — Link Mobility (anbefalt for HMS-varsler)
  SMS_PROVIDER?: string;            // "link_mobility" | "intellisms" | "prosms" | "mock"
  LINK_MOBILITY_USERNAME?: string;
  LINK_MOBILITY_PASSWORD?: string;
  LINK_MOBILITY_FROM?: string;
  // SMS — IntelliSMS
  INTELLISMS_USERNAME?: string;
  INTELLISMS_PASSWORD?: string;
  INTELLISMS_FROM?: string;
  // SMS — ProSMS (brukes også for Ring meg)
  PROSMS_API_KEY?: string;
  PRO_SMS_API_KEY?: string;
  PROSMS_FROM?: string;
  PROSMS_API_URL?: string;
  // SMS — salg
  RING_MEG_SALES_PHONE?: string;

  // Fiken (optional)
  FIKEN_API_KEY?: string;
  FIKEN_WEBHOOK_SECRET?: string;

  // AI (optional)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;

  // App URL
  NEXT_PUBLIC_APP_URL?: string;
}

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
] as const;

const CONDITIONAL_ENV_VARS = {
  // Må ha enten R2 eller S3 credentials hvis ikke lokal lagring
  storage: {
    condition: () => process.env.STORAGE_TYPE !== "local",
    vars: ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const,
    or: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] as const,
    message: "R2 eller S3 credentials må være satt når STORAGE_TYPE ikke er 'local'",
  },
} as const;

/**
 * Validerer environment variables ved oppstart
 * Kaster feil hvis kritiske variabler mangler
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // Sjekk påkrevde variabler
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      errors.push(`Manglende påkrevd miljøvariabel: ${varName}`);
    }
  }

  // Sjekk betingede variabler
  for (const [name, config] of Object.entries(CONDITIONAL_ENV_VARS)) {
    if (config.condition()) {
      const hasRequired = config.vars.some(v => process.env[v]);
      const hasAlternative = config.or?.some(v => process.env[v]);
      
      if (!hasRequired && !hasAlternative) {
        errors.push(config.message);
      }
    }
  }

  // Valider spesifikke verdier
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push("NEXTAUTH_SECRET må være minst 32 tegn lang");
  }

  // Logg advarsler for anbefalte variabler
  const warnings: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY ikke satt - e-postvarsler vil ikke fungere");
  }

  const smsProvider = process.env.SMS_PROVIDER ?? "link_mobility";
  if (smsProvider === "link_mobility" && (!process.env.LINK_MOBILITY_USERNAME || !process.env.LINK_MOBILITY_PASSWORD)) {
    warnings.push("Link Mobility-credentials ikke satt (LINK_MOBILITY_USERNAME / LINK_MOBILITY_PASSWORD) - SMS-varsler vil ikke fungere");
  } else if (smsProvider === "intellisms" && (!process.env.INTELLISMS_USERNAME || !process.env.INTELLISMS_PASSWORD)) {
    warnings.push("IntelliSMS-credentials ikke satt - SMS-varsler vil ikke fungere");
  } else if (smsProvider === "prosms" && !process.env.PROSMS_API_KEY && !process.env.PRO_SMS_API_KEY) {
    warnings.push("ProSMS API-nøkkel ikke satt (PROSMS_API_KEY) - SMS-varsler vil ikke fungere");
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push("Upstash Redis ikke konfigurert - bruker in-memory rate limiting (ikke anbefalt for produksjon)");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push("NEXT_PUBLIC_APP_URL ikke satt - noen lenker i e-poster kan være feil");
  }

  if (
    process.env.NEXT_PUBLIC_ENABLE_SSO === "true" &&
    (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET)
  ) {
    warnings.push(
      "NEXT_PUBLIC_ENABLE_SSO er aktivert, men AZURE_AD_CLIENT_ID/AZURE_AD_CLIENT_SECRET mangler - Microsoft-innlogging vil ikke fungere"
    );
  }

  // Kast feil hvis det er kritiske mangler
  if (errors.length > 0) {
    console.error("\n❌ KRITISKE MILJØVARIABEL-FEIL:");
    errors.forEach(error => console.error(`  - ${error}`));
    console.error("\nApplikasjonen kan ikke starte uten disse variablene.\n");
    throw new Error(`Manglende påkrevde miljøvariabler: ${errors.join(", ")}`);
  }

  // Logg advarsler
  if (warnings.length > 0) {
    console.warn("\n⚠️  MILJØVARIABEL-ADVARSLER:");
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn("");
  }

  // Suksess
  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Alle miljøvariabler validert");
  }
}

/**
 * Hjelpefunksjon for å få en påkrevd env var
 * Kaster feil hvis den ikke finnes
 */
export function getRequiredEnv(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Manglende påkrevd miljøvariabel: ${key}`);
  }
  return value;
}

/**
 * Hjelpefunksjon for å få en valgfri env var med default
 */
export function getOptionalEnv(
  key: keyof EnvConfig,
  defaultValue: string
): string {
  return process.env[key] || defaultValue;
}

/**
 * Sjekk om vi kjører i produksjon
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Sjekk om vi kjører i development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Sjekk om vi kjører i test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}
