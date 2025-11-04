import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

/**
 * SIKKERHET: API Validation Middleware
 * 
 * Standardisert validation og error handling for alle API routes.
 */

/**
 * Standard API Error Response Format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Standard API Success Response Format
 */
export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Valider request body mot Zod schema
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: createErrorResponse(
          "INVALID_JSON",
          "Ugyldig JSON format",
          400
        ),
      };
    }

    if (error instanceof ZodError) {
      return {
        success: false,
        response: createValidationErrorResponse(error),
      };
    }

    return {
      success: false,
      response: createErrorResponse(
        "VALIDATION_ERROR",
        "Validering feilet",
        400
      ),
    };
  }
}

/**
 * Valider query parameters mot Zod schema
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse } {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: createValidationErrorResponse(error),
      };
    }

    return {
      success: false,
      response: createErrorResponse(
        "VALIDATION_ERROR",
        "Validering av query parameters feilet",
        400
      ),
    };
  }
}

/**
 * Opprett standardisert error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };

  return NextResponse.json(error, { status });
}

/**
 * Opprett success response
 */
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiSuccess<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Opprett validation error response fra Zod error
 */
export function createValidationErrorResponse(error: ZodError<any>): NextResponse {
  const details = error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));

  return createErrorResponse(
    "VALIDATION_ERROR",
    "Validering feilet. Sjekk inputdata.",
    400,
    details
  );
}

/**
 * Handle async route errors
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof ZodError) {
    return createValidationErrorResponse(error);
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "En intern feil oppstod";

    return createErrorResponse("INTERNAL_ERROR", message, 500);
  }

  return createErrorResponse(
    "UNKNOWN_ERROR",
    "En ukjent feil oppstod",
    500
  );
}

/**
 * Wrapper for API routes med error handling
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  MISSING_FIELD: "MISSING_FIELD",

  // Authentication
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",

  // External
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",

  // File Upload
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
} as const;

