import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const applySecurityHeaders = (response: NextResponse): NextResponse => {
  // Strict-Transport-Security (HSTS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // X-Frame-Options (Clickjacking protection)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // X-Content-Type-Options (MIME sniffing protection)
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer-Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // X-DNS-Prefetch-Control
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Content-Security-Policy (CSP)
  // I development trenger React eval() for stack trace-rekonstruksjon.
  // I produksjon er unsafe-eval fjernet for maksimal sikkerhet.
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com"
    : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com";

  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Tving alltid prefiks-frie URL-er (/dashboard, ikke /en/dashboard)
  const localePrefixMatch = pathname.match(/^\/(nb|nn|en)(\/.*)?$/);
  if (localePrefixMatch) {
    const normalizedPath = localePrefixMatch[2] || "/";
    const url = request.nextUrl.clone();
    url.pathname = normalizedPath;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Beskyttede routes - krever autentisering
  const protectedRoutes = [
    "/dashboard",
    "/admin",
    "/ansatt",
    "/konsern",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // Redirect til login hvis ikke autentisert
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    // Konsern-bruker uten tenant: redirect til konsern-dashboard
    if (
      !token.tenantId &&
      token.corporateGroupId &&
      !token.isSuperAdmin &&
      !token.isSupport &&
      !pathname.startsWith("/konsern") &&
      !pathname.startsWith("/api")
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/konsern", request.url)));
    }

    // Multi-tenant: Redirect til tenant-velger hvis brukeren har flere tenants og ingen tenant er valgt
    if (
      token.hasMultipleTenants === true &&
      !token.tenantId &&
      !pathname.startsWith("/select-tenant") &&
      !pathname.startsWith("/api")
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/select-tenant", request.url)));
    }

    // Superadmin/Support access control
    if (pathname.startsWith("/admin")) {
      const isSuperAdmin = token.isSuperAdmin === true;
      const isSupport = token.isSupport === true;

      if (!isSuperAdmin && !isSupport) {
        return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
      }
    }

    // Konsern access control
    if (pathname.startsWith("/konsern")) {
      const hasCorporateGroup = Boolean(token.corporateGroupId);
      const isSuperAdmin = token.isSuperAdmin === true;
      const isSupport = token.isSupport === true;

      if (!hasCorporateGroup && !isSuperAdmin && !isSupport) {
        return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
      }
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
