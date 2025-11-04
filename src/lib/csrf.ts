import crypto from "crypto";

/**
 * SIKKERHET: CSRF Protection
 * 
 * Generer og valider CSRF tokens for å beskytte mot Cross-Site Request Forgery.
 * 
 * Brukes for:
 * - Forms (POST, PUT, DELETE, PATCH)
 * - Sensitive API endpoints
 * 
 * IKKE bruk for:
 * - GET requests
 * - Public API endpoints
 * - NextAuth (har egen CSRF beskyttelse)
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf-token";

/**
 * Generer et tilfeldig CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Valider CSRF token fra request
 */
export function validateCsrfToken(
  requestToken: string | null,
  sessionToken: string | null
): boolean {
  if (!requestToken || !sessionToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(requestToken),
      Buffer.from(sessionToken)
    );
  } catch (error) {
    // Length mismatch or other error
    return false;
  }
}

/**
 * Hent CSRF token fra request headers eller body
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Sjekk header først
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  if (headerToken) {
    return headerToken;
  }

  // Alternativt: Sjekk cookie (for dobbel submit pattern)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    if (csrfCookie) {
      return csrfCookie.split("=")[1];
    }
  }

  return null;
}

/**
 * Middleware helper for CSRF validation
 */
export function requireCsrfToken(
  request: Request,
  sessionToken: string | null
): { valid: boolean; error?: string } {
  // Skip GET, HEAD, OPTIONS (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return { valid: true };
  }

  const requestToken = getCsrfTokenFromRequest(request);
  const isValid = validateCsrfToken(requestToken, sessionToken);

  if (!isValid) {
    return {
      valid: false,
      error: "Invalid or missing CSRF token",
    };
  }

  return { valid: true };
}

export { CSRF_TOKEN_HEADER, CSRF_COOKIE_NAME };

