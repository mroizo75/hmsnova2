# 🔐 HMS Nova - Sikkerhetsanalyse og Anbefalinger

**Generert:** 2025-11-04  
**Status:** Produksjonsklar med kritiske mangler

---

## 📊 Executive Summary

HMS Nova har et solid grunnlag med god autentisering, autorisering og audit logging. **Men det mangler flere kritiske sikkerhetsfunksjoner som må implementeres før full produksjon.**

**Risikonivå: 🟡 MEDIUM-HIGH**

---

## ✅ HVA SOM ER BRA (Implementert)

### Autentisering & Autorisasjon
- ✅ **NextAuth v4** med credentials provider
- ✅ **bcryptjs** for sikker passord-hashing
- ✅ **JWT-based sessions** (server-side)
- ✅ **CASL** for finkornet tilgangskontroll (RBAC/ABAC)
- ✅ **Multi-tenant isolasjon** (tenantId på alle ressurser)
- ✅ **Role-based access** (ADMIN, HMS, LEDER, VERNEOMBUD, ANSATT, BHT, REVISOR)
- ✅ **SuperAdmin/Support** separate roller

### Input Validering
- ✅ **Zod schemas** på alle server actions
- ✅ **React Hook Form** med zodResolver på frontend
- ✅ **File upload validering** (type, størrelse)
- ✅ **Prisma ORM** (SQL injection beskyttelse)

### Audit & Compliance
- ✅ **Audit logging** (AuditLog tabell)
- ✅ **ISO 9001 compliance** (dokumentert)
- ✅ **Change tracking** på kritiske operasjoner
- ✅ **Tenant isolasjon** i alle queries

### File Storage
- ✅ **Cloudflare R2/S3** for file storage
- ✅ **Presigned URLs** for sikker tilgang
- ✅ **File type validation** (whitelist)
- ✅ **Size limits** (5MB for images)
- ✅ **Unique file keys** (timestamp + random)

---

## ❌ KRITISKE SIKKERHETSHULL (Must-fix før produksjon)

### 🚨 1. **INGEN Rate Limiting**
**Risiko:** Brute force attacks, DDoS, API misuse

**Mangler:**
- Ingen rate limiting på `/api/auth/signin`
- Ingen rate limiting på `/api/auth/callback/credentials`
- Ingen rate limiting på password reset (når implementert)
- Ingen generell API rate limiting

**Løsning:**
```typescript
// Installer: npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 s"), // 5 forsøk per 10 sek
});

// I auth route:
const { success } = await ratelimit.limit(request.ip);
if (!success) {
  return Response.json({ error: "Too many requests" }, { status: 429 });
}
```

**Prioritet:** 🔴 **KRITISK**

---

### 🚨 2. **INGEN Security Headers**
**Risiko:** XSS, clickjacking, MIME sniffing attacks

**Mangler:**
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Permissions-Policy

**Løsning:**
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

**Prioritet:** 🔴 **KRITISK**

---

### 🚨 3. **INGEN Account Lockout**
**Risiko:** Brute force password attacks

**Mangler:**
- Ingen tracking av failed login attempts
- Ingen account lockout etter X forsøk
- Ingen CAPTCHA etter flere forsøk

**Løsning:**
```prisma
model User {
  // ... existing fields ...
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  lastLoginAttempt    DateTime?
}
```

```typescript
// I auth.ts authorize:
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 min

if (user.lockedUntil && user.lockedUntil > new Date()) {
  throw new Error("Kontoen er midlertidig låst. Prøv igjen senere.");
}

if (!isPasswordValid) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: { increment: 1 },
      lastLoginAttempt: new Date(),
      ...(user.failedLoginAttempts + 1 >= MAX_ATTEMPTS && {
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION)
      })
    }
  });
  throw new Error("Ugyldig pålogging");
}

// Reset på successful login
await prisma.user.update({
  where: { id: user.id },
  data: { failedLoginAttempts: 0, lockedUntil: null }
});
```

**Prioritet:** 🟠 **HØY**

---

### 🚨 4. **INGEN CSRF Protection**
**Risiko:** Cross-Site Request Forgery attacks

**Problem:** 
- Server actions er ikke beskyttet mot CSRF
- API routes mangler CSRF tokens

**Løsning:**
NextAuth har innebygd CSRF, men server actions trenger:
```typescript
// middleware.ts
import { csrf } from 'csrf';

export function middleware(request: NextRequest) {
  // Valider CSRF token for POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const token = request.headers.get('x-csrf-token');
    if (!isValidCSRFToken(token)) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }
}
```

**Prioritet:** 🟠 **HØY**

---

### 🚨 5. **HTML Injection i TipTap**
**Risiko:** Stored XSS attacks via blog posts

**Problem:**
```typescript
// src/app/(public)/blogg/[slug]/page.tsx
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

**Løsning:**
```bash
npm install dompurify isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(post.content, {
  ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
});

<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

**Prioritet:** 🔴 **KRITISK**

---

## ⚠️ VIKTIGE MANGLER (Bør implementeres snart)

### 6. **Ingen Password Reset**
- Ingen "Glemt passord" funksjonalitet
- Brukere som glemmer passord er låst ute

**Løsning: Implementer password reset flow:**
1. Request reset (email link med token)
2. Token validering (expires etter 1 time)
3. Set new password
4. Invalidate old sessions

---

### 7. **Ingen Email Verification**
- Brukere kan registrere med falske emails
- Ingen verifisering av email-adresser

**Løsning: NextAuth har innebygd email verification:**
```typescript
// I authOptions:
callbacks: {
  async signIn({ user }) {
    if (!user.emailVerified) {
      return '/verify-email';
    }
    return true;
  }
}
```

---

### 8. **Ingen 2FA/MFA**
- Kun passord for autentisering
- Ingen støtte for TOTP/SMS/Security keys

**Løsning:**
```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

Implementer:
- TOTP (Google Authenticator)
- WebAuthn (Biometric/Security keys)
- Backup codes

---

### 9. **Ingen Session Management**
**Mangler:**
- Ingen konfigurerbar session timeout
- Ingen "Force logout on all devices"
- Ingen aktive sesjoner oversikt

**Løsning:**
```typescript
// authOptions:
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60, // 8 timer
  updateAge: 24 * 60 * 60, // Refresh hver 24t
}
```

---

### 10. **Manglende Audit Logging**
**Hva som mangler:**
- IP-adresser logges ikke
- Sensitive operasjoner mangler logging:
  - Password changes
  - Role changes
  - Permission changes
  - Data exports

**Løsning:**
```typescript
// Utvid AuditLog:
model AuditLog {
  // ... existing fields ...
  ipAddress String?
  userAgent String?  @db.Text
}

// I audit-log.ts:
static async log(
  // ... existing params ...
  ipAddress?: string,
  userAgent?: string
) {
  await prisma.auditLog.create({
    data: {
      // ... existing data ...
      ipAddress,
      userAgent,
    },
  });
}
```

---

## 🛡️ GDPR COMPLIANCE MANGLER

### 11. **Ingen Data Export**
**GDPR Artikkel 20:** Rett til dataportabilitet

**Løsning:**
```typescript
// /api/user/export/route.ts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session.user.id;
  
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      // All related data
      incidents: true,
      documents: true,
      auditLogs: true,
      // ... etc
    }
  });
  
  return Response.json(userData);
}
```

---

### 12. **Ingen "Right to be Forgotten"**
**GDPR Artikkel 17:** Rett til sletting

**Løsning:**
```typescript
// /api/user/delete-account/route.ts
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // 1. Anonymiser data (ikke slett helt pga audit trail)
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email: `deleted-${Date.now()}@hmsnova.no`,
      name: 'Deleted User',
      password: null,
      phone: null,
      address: null,
      // ... etc
    }
  });
  
  // 2. Slett personlige filer fra R2
  // 3. Marker konto som slettet
  // 4. Send bekreftelse på email
}
```

---

### 13. **Cookie Consent ikke håndhevet**
- Cookie consent UI finnes
- Men ingen faktisk enforcement
- Google Analytics kjører uavhengig av samtykke

**Løsning:**
```typescript
// Only load GA if consent given:
if (typeof window !== 'undefined') {
  const consent = localStorage.getItem('cookie-consent');
  if (consent) {
    const prefs = JSON.parse(consent);
    if (prefs.analytics) {
      // Load GA
    }
  }
}
```

---

## 🔧 INFRASTRUKTUR & MONITORING

### 14. **Ingen Error Monitoring**
**Mangler:**
- Ingen Sentry/Rollbar
- Ingen error tracking
- console.error() går tapt i produksjon

**Løsning:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

### 15. **Ingen Structured Logging**
**Problem:**
- console.log() overalt
- Ingen strukturert logging
- Vanskelig å søke/filtrere i produksjon

**Løsning:**
```bash
npm install pino pino-pretty
```

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Bruk:
logger.info({ userId, action: 'LOGIN' }, 'User logged in');
logger.error({ error, tenantId }, 'Failed to create document');
```

---

### 16. **Ingen Database Backup Strategi**
**Kritisk mangel:**
- Ingen automatiske backups
- Ingen backup testing
- Ingen disaster recovery plan

**Løsning:**
```bash
# Cron job for daily backups:
0 2 * * * mysqldump -u user -p database > /backups/$(date +\%Y\%m\%d).sql

# Oppbevar 30 dagers backups
# Test restore månedlig
# Store backups off-site (S3/R2)
```

---

### 17. **Ingen Health Checks**
**Mangler:**
- Ingen `/health` endpoint
- Ingen database connection check
- Ingen R2 connection check
- Ingen Redis connection check

**Løsning:**
```typescript
// /api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    redis: await checkRedis(),
    timestamp: new Date().toISOString(),
  };
  
  const healthy = Object.values(checks).every(c => c === true);
  
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

---

### 18. **Ingen Metrics/Observability**
**Mangler:**
- Ingen performance metrics
- Ingen user analytics (GDPR-compliant)
- Ingen system metrics (CPU, RAM, disk)

**Løsning:**
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
```

Implementer:
- Request duration tracking
- Database query performance
- Error rates
- User activity metrics (anonymisert)

---

## 🔒 SECRETS MANAGEMENT

### 19. **Ingen Secrets Encryption**
**Problem:**
- `.env` filer i plain text
- Ingen secrets rotation
- Ingen separation av environments

**Løsning:**
```bash
# Bruk Doppler, AWS Secrets Manager, eller Vault
npm install @dopplerhq/node-sdk

# Eller encrypt .env:
npm install dotenv-vault
npx dotenv-vault@latest new
npx dotenv-vault@latest push
npx dotenv-vault@latest keys
```

---

### 20. **Webhook Security**
**Problem:**
- `/api/webhooks/fiken` har ingen signature verification
- Hvem som helst kan sende fake webhooks

**Løsning:**
```typescript
// I fiken webhook:
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// I route:
const signature = req.headers.get('x-fiken-signature');
const body = await req.text();

if (!verifyWebhookSignature(body, signature, process.env.FIKEN_WEBHOOK_SECRET)) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
```

---

## 📋 PRIORITERT IMPLEMENTERINGSPLAN

### 🔴 **FASE 1: Kritisk (Før produksjon)**
1. ✅ Implementer Rate Limiting (2-4 timer)
2. ✅ Legg til Security Headers (1-2 timer)
3. ✅ Sanitize HTML i TipTap (2-3 timer)
4. ✅ Account Lockout (3-4 timer)
5. ✅ Webhook Signature Verification (2 timer)

**Estimert tid:** 10-15 timer  
**Deadline:** Før go-live

---

### 🟠 **FASE 2: Viktig (Første 2 uker etter launch)**
6. ✅ Password Reset Flow (6-8 timer)
7. ✅ Email Verification (4-6 timer)
8. ✅ CSRF Protection (3-4 timer)
9. ✅ Improved Audit Logging (IP, User Agent) (2-3 timer)
10. ✅ Error Monitoring (Sentry) (2-3 timer)

**Estimert tid:** 17-24 timer  
**Deadline:** 2 uker etter launch

---

### 🟡 **FASE 3: Anbefalt (Første måned)**
11. ✅ Structured Logging (Pino) (4-6 timer)
12. ✅ Health Check Endpoint (2-3 timer)
13. ✅ GDPR Data Export (6-8 timer)
14. ✅ GDPR Right to Deletion (6-8 timer)
15. ✅ Database Backup Automation (4-6 timer)

**Estimert tid:** 22-31 timer  
**Deadline:** 1 måned etter launch

---

### 🔵 **FASE 4: Nice-to-have (Første 3 måneder)**
16. ✅ 2FA/MFA (16-24 timer)
17. ✅ Session Management UI (8-12 timer)
18. ✅ Metrics/Observability (12-16 timer)
19. ✅ Secrets Management (4-6 timer)
20. ✅ Security Audit & Penetration Testing (40+ timer)

**Estimert tid:** 80-98 timer  
**Deadline:** 3 måneder etter launch

---

## 🎯 KONKLUSJON

HMS Nova har et **solid fundament** med god autentisering, autorisasjon og compliance-støtte. Men det **mangler flere kritiske sikkerhetslag** som må implementeres før full produksjon.

### Umiddelbare risikoer:
1. 🚨 **Brute force attacks** (ingen rate limiting)
2. 🚨 **XSS via stored HTML** (ingen sanitization)
3. 🚨 **Manglende security headers** (clickjacking, etc.)

### Neste steg:
1. **Implementer Fase 1 (10-15 timer)** før produksjon
2. **Planlegg Fase 2 (17-24 timer)** for første 2 uker
3. **Bestill sikkerhetstesting** når Fase 1-2 er ferdig

### Total estimert tid for produksjonsklar sikkerhet:
**130-170 timer** (ca 3-4 uker full-time)

---

**Oppdatert:** 2025-11-04  
**Ansvarlig:** Kenneth / Development Team  
**Neste review:** Etter Fase 1 implementering

