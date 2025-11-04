import { z } from "zod";

/**
 * SIKKERHET: Input Validation for Authentication
 * 
 * Alle auth-relaterte requests valideres med Zod schemas.
 */

// Email validation
export const emailSchema = z
  .string()
  .email("Ugyldig e-postadresse")
  .min(3, "E-postadressen er for kort")
  .max(255, "E-postadressen er for lang")
  .toLowerCase()
  .trim();

// Password validation (strict)
export const passwordSchema = z
  .string()
  .min(12, "Passordet må være minst 12 tegn")
  .max(128, "Passordet er for langt")
  .regex(/[A-Z]/, "Passordet må inneholde minst én stor bokstav")
  .regex(/[a-z]/, "Passordet må inneholde minst én liten bokstav")
  .regex(/[0-9]/, "Passordet må inneholde minst ett tall")
  .regex(/[^A-Za-z0-9]/, "Passordet må inneholde minst ett spesialtegn (!@#$%^&* etc.)");

// Password validation (legacy - for existing users)
export const passwordSchemaLegacy = z
  .string()
  .min(8, "Passordet må være minst 8 tegn")
  .max(128, "Passordet er for langt");

// Name validation
export const nameSchema = z
  .string()
  .min(1, "Navn er påkrevd")
  .max(100, "Navnet er for langt")
  .trim()
  .regex(/^[a-zA-ZæøåÆØÅ\s\-']+$/, "Navnet kan bare inneholde bokstaver, mellomrom, bindestrek og apostrof");

// Organization number (Norwegian)
export const orgNumberSchema = z
  .string()
  .regex(/^\d{9}$/, "Organisasjonsnummer må være 9 siffer")
  .optional()
  .or(z.literal(""));

// Phone number (Norwegian)
export const phoneSchema = z
  .string()
  .regex(/^(\+47)?[2-9]\d{7}$/, "Ugyldig norsk telefonnummer")
  .optional()
  .or(z.literal(""));

// Token validation
export const tokenSchema = z
  .string()
  .min(32, "Ugyldig token")
  .max(256, "Ugyldig token")
  .regex(/^[a-f0-9]+$/, "Ugyldig token format");

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchemaLegacy, // Use legacy for login
});

/**
 * Password Reset Request Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Password Reset Schema
 */
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema, // Use strict for new passwords
});

/**
 * Email Verification Schema
 */
export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

/**
 * Resend Verification Schema
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Change Password Schema (for logged-in users)
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordSchemaLegacy,
  newPassword: passwordSchema, // Use strict for new passwords
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passordene matcher ikke",
  path: ["confirmPassword"],
});

/**
 * Update Profile Schema
 */
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
});

/**
 * Register User Schema
 */
export const registerUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  companyName: z.string().min(1, "Bedriftsnavn er påkrevd").max(200).trim().optional(),
  orgNumber: orgNumberSchema.optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

