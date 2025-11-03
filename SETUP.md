# HMS Nova 2.0 - Setup Guide

## Installasjon og oppsett

### 1. Klon og installer

```bash
cd hmsnova2
npm install
```

### 2. Sett opp miljøvariabler

Kopier `.env.example` til `.env` og fyll inn verdier:

```bash
# Generer NEXTAUTH_SECRET
openssl rand -base64 32
```

Minimum nødvendige variabler for lokal utvikling:
```env
DATABASE_URL="mysql://user:pass@localhost:3306/hmsnova"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=din-genererte-secret
```

### 3. Sett opp MySQL database

```bash
# Logg inn i MySQL
mysql -u root -p

# Opprett database
CREATE DATABASE hmsnova CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Opprett bruker (valgfritt)
CREATE USER 'hmsnova'@'localhost' IDENTIFIED BY 'ditt-passord';
GRANT ALL PRIVILEGES ON hmsnova.* TO 'hmsnova'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Push Prisma schema til database

```bash
# For utvikling (anbefalt først)
npm run db:push

# Eller opprett migrering for produksjon
npm run db:migrate
```

### 5. Seed database med testdata

```bash
npm run db:seed
```

Dette oppretter:
- En test tenant "Test Bedrift AS"
- Admin bruker: `admin@test.no` / `admin123`
- Ansatt bruker: `ansatt@test.no` / `ansatt123`

### 6. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) - du vil bli redirected til login.

## Verktøy

### Prisma Studio

Visuell database editor:
```bash
npm run db:studio
```

Åpnes på [http://localhost:5555](http://localhost:5555)

### Database kommandoer

```bash
npm run db:generate  # Generer Prisma Client
npm run db:push      # Push schema uten migrering (utvikling)
npm run db:migrate   # Opprett og kjør migrering (produksjon)
npm run db:seed      # Seed database med testdata
npm run db:studio    # Åpne Prisma Studio
```

## Arkitektur

### Autentisering

- NextAuth v4 med credentials provider
- Passord hashet med bcryptjs
- JWT sessions
- Protected routes via middleware

### Autorisasjon (CASL)

Roller (hierarki):
1. **ADMIN** - Full tilgang
2. **HMS** - HMS-koordinator, nesten full tilgang
3. **LEADER** - Leder, kan administrere i sin avdeling
4. **VERNEOMBUD** - Kan rapportere og se risiko/avvik
5. **BHT** - Bedriftshelsetjeneste, kan lese og kommentere
6. **ANSATT** - Kan lese dokumenter og rapportere hendelser
7. **REVISOR** - Kun lesetilgang

Se `src/lib/casl.ts` for abilities.

### Multi-tenant

Hver bedrift er en `Tenant`. Alle data er scopet til en tenant via `tenantId`.
Brukere kan være medlem av flere tenants med forskjellige roller.

### Server Actions

Bruk `authAction` helper for å lage protected server actions:

```typescript
import { authAction } from "@/lib/server-action";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(3),
});

export const createDocument = authAction(
  schema,
  async (input, ctx) => {
    // ctx.user inneholder pålogget bruker
    // input er validert mot schema
    return prisma.document.create({
      data: { ...input, tenantId: ctx.user.tenantId }
    });
  }
);
```

### Internasjonalisering (i18n)

Støtter 3 språk:
- `nb` - Norsk bokmål (default)
- `nn` - Norsk nynorsk
- `en` - Engelsk

Oversettelser i `src/i18n/messages/`.

Bruk i komponenter:
```typescript
import { useTranslations } from "next-intl";

function MyComponent() {
  const t = useTranslations();
  return <h1>{t("nav.dashboard")}</h1>;
}
```

## Neste steg

### Modul-utvikling

Følg denne strukturen for hver modul (f.eks. Documents):

```
src/features/documents/
├── components/
│   ├── document-list.tsx
│   ├── document-form.tsx
│   └── document-detail.tsx
├── hooks/
│   └── use-documents.ts
└── schemas/
    └── document.schema.ts

src/server/actions/
└── document.actions.ts
```

### Eksempel: Opprett en ny modul

1. **Schema** - `src/features/risks/schemas/risk.schema.ts`
```typescript
import { z } from "zod";

export const createRiskSchema = z.object({
  title: z.string().min(3),
  likelihood: z.number().int().min(1).max(5),
  consequence: z.number().int().min(1).max(5),
});
```

2. **Server Action** - `src/server/actions/risk.actions.ts`
```typescript
"use server";

import { authAction } from "@/lib/server-action";
import { createRiskSchema } from "@/features/risks/schemas/risk.schema";

export const createRisk = authAction(
  createRiskSchema,
  async (input, ctx) => {
    const score = input.likelihood * input.consequence;
    return prisma.risk.create({
      data: { 
        ...input, 
        score,
        ownerId: ctx.user.id,
        tenantId: "..." // hent fra ctx/session
      }
    });
  }
);
```

3. **Hook** - `src/features/risks/hooks/use-risks.ts`
```typescript
import { useQuery } from "@tanstack/react-query";

export function useRisks(tenantId: string) {
  return useQuery({
    queryKey: ["risks", tenantId],
    queryFn: async () => {
      // fetch risker
    },
  });
}
```

4. **Page** - `src/app/(dashboard)/dashboard/risks/page.tsx`
```typescript
import { RiskList } from "@/features/risks/components/risk-list";

export default function RisksPage() {
  return <RiskList />;
}
```

## Produksjon

### Environment variabler

Sørg for å sette alle nødvendige variabler:
- `DATABASE_URL` - Produksjons MySQL URL
- `NEXTAUTH_URL` - Din produksjons-URL
- `NEXTAUTH_SECRET` - Sterk random secret
- Andre tjenester etter behov

### Build

```bash
npm run build
npm run start
```

### Database migreringer

Bruk alltid migreringer i produksjon:
```bash
npm run db:migrate
```

## Feilsøking

### "Prisma Client not found"

```bash
npm run db:generate
```

### "Can't reach database"

Sjekk at MySQL kjører og at `DATABASE_URL` er korrekt.

### "Module not found" errors

```bash
npm install
```

### Middleware errors med next-intl

Sørg for at `src/i18n/request.ts` og `src/middleware.ts` eksisterer.

## Support

For spørsmål om HMS Nova 2.0, kontakt utviklingsteamet.

