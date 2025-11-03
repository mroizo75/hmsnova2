# HMS Nova 2.0

HMS/HSEQ-system bygget med Next.js 15, Prisma og MySQL.

## Komme i gang

### 1. Installer dependencies

```bash
npm install
```

### 2. Sett opp miljøvariabler

Opprett en `.env` fil i root med følgende innhold:

```env
# Database
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/hmsnova"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generer-en-sikker-tilfeldig-secret-her

# UploadThing & R2 (valgfritt nå)
UPLOADTHING_SECRET=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=hmsnova

# Resend (valgfritt nå)
RESEND_API_KEY=

# Upstash Redis (valgfritt nå)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

For å generere NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Sett opp database

Opprett MySQL database:
```bash
mysql -u root -p
CREATE DATABASE hmsnova CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Kjør Prisma migrasjoner:
```bash
npm run db:push
# eller for produksjon:
npm run db:migrate
```

### 4. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Kommandoer

- `npm run dev` - Start utviklingsserver
- `npm run build` - Bygg for produksjon
- `npm run start` - Start produksjonsserver
- `npm run db:generate` - Generer Prisma Client
- `npm run db:push` - Push schema til database (utvikling)
- `npm run db:migrate` - Kjør migrasjoner (produksjon)
- `npm run db:studio` - Åpne Prisma Studio

## Teknologistack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: MySQL 8, Prisma ORM
- **Auth**: NextAuth.js v4
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl (nb/nn/en)
- **Autorisasjon**: CASL

## Mappestruktur

```
src/
├── app/                  # Next.js App Router
│   ├── (public)/        # Offentlige sider (login)
│   ├── (dashboard)/     # Beskyttede sider
│   └── api/             # API routes
├── components/          # Gjenbrukbare komponenter
│   └── ui/              # shadcn/ui komponenter
├── features/            # Feature-spesifikk kode
│   ├── documents/
│   ├── risks/
│   ├── incidents/
│   └── ...
├── lib/                 # Utilities og konfigurasjoner
│   ├── db.ts           # Prisma client
│   ├── auth.ts         # NextAuth config
│   ├── casl.ts         # RBAC/autorisasjon
│   └── utils.ts        # Generelle utilities
├── server/              # Server-side kode
│   ├── actions/        # Server actions
│   └── jobs/           # BullMQ jobs
├── types/              # TypeScript types
└── i18n/               # Oversettelser
```

## Neste steg

1. **Opprett test-bruker** - Bruk Prisma Studio eller SQL
2. **Utvikle moduler** - Start med Documents eller Risks
3. **Sett opp BullMQ** - For påminnelser og jobber
4. **Konfigurer UploadThing** - For filopplasting
5. **Deploy** - På VPS eller Vercel

## Lisens

Proprietær - KKS AS
