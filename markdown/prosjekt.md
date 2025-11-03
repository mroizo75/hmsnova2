# HMS Nova 2.0 – Fullstack spesifikasjon (Next.js + Prisma)

> Mål: Et multi‑tenant HMS/HSEQ‑system som oppfyller krav i Norge/EØS (Internkontrollforskriften, Arbeidsmiljøloven), EU‑rammedirektiv 89/391/EØF og støtter ISO 9001/45001/14001 prosesser. Bygges for å være lett å drifte på egen VPS nå, men enkelt å skalere til SaaS.

---

## 1) Teknologistack (anbefalt)

**Frontend/Server**

* Next.js (App Router) + React 18
* TypeScript overalt
* shadcn/ui + Tailwind (designsystem)
* TanStack Query for server‑state
* Zod for validering (skjema + API)
* React Hook Form (skjema) med zodResolver
* next-intl (i18n) – nb/nn/en

**Auth & RBAC**

* **Clerk** (enkelt, robust, App Router‑first) *eller* **Auth.js (NextAuth)** om du vil eie alt selv
* CASL for autorisasjon (rolle/ressurs‑basert)

**Database & ORM**

* MySQL 8 (InnoDB) på VPS
* Prisma ORM (Migrate + Client)
* Drizzle kan vurderes senere for migrasjons‑diff

**Filer & e‑post**

* UploadThing (enkle opplastinger) + Cloudflare R2 (lagring)
* Resend (transaksjons‑epost)

**Jobber & sanntidsoppgaver**

* BullMQ + (Upstash) Redis for køer/planlagte jobber på VPS
* Inngest kan brukes for mer komplekse arbeidsflyter/scheduling senere

**PDF & eksporter**

* Playwright/Puppeteer server‑side (HTML‑>PDF) for rapporter

**Observability & sikkerhet**

* OpenTelemetry (logs/metrics/traces) + lokalt Loki/Grafana senere
* Helmet‑lignende head‑sikring (Next headers), CSRF i mutasjoner
* Rate limiting (Upstash Ratelimit) på auth‑kritiske endepunkt

---

## 2) Domener og moduler

**Kjerne (lovpålagte)**

1. Dokumentstyring (Lover, prosedyrer, sjekklister, versjoner, e‑sign)
2. HMS‑mål & politikk (mål, KPI, årsplan)
3. Organisasjon & roller (kart, ansvar, AMU, VO/BHT)
4. Risikovurdering (farer, matrise, tiltak, revisjonshistorikk)
5. Avvik & hendelser (nestenulykker, skader, rotårsaker, CAPA)
6. Opplæring & kompetanse (kurs, sertifikat, fornyelser, e‑sign bekreftelser)
7. Tiltaks‑/aktivitetsplan (samler tiltak fra risiko, avvik, revisjon, mål)
8. Revisjon & ledelsens gjennomgang (plan, funn, rapport, beslutninger)

**Tilvalg (bransjeavhengig)**
9. Kjemikalier & miljø (SDS, CLP, eksponering, miljøaspekter/mål)
10. Beredskap (planer, nødplakater, øvelser, utstyrssjekk)
11. Kommunikasjon & medvirkning (varsling, forslag, AMU‑modul)
12. Rapportering & KPI (dashboards, H‑verdi, eksport)

---

## 3) Systemarkitektur

**Multi‑tenant**

* `Tenant` (selskap) tabell, `tenantId` på alle domenetabeller
* Superadmin‑org (KKS AS) kan multi‑manage

**Rollemodell** (minimum)

* `ADMIN` (tenant‑eier), `LEDER/HMS`, `VERNEOMBUD`, `ANSATT`, `BHT`, `REVISOR` (read‑only)
* CASL abilities beregnes per request ut fra rolle + kontekst (eier/avdeling)

**Dataflyt**

* App Router server actions for CRUD (med zod‑validering)
* TanStack Query for datahenting/optimistiske oppdateringer
* BullMQ for tidsstyrte «forfall», påminnelser og rapport‑generering

---

## 4) Filsystem‑struktur (Next.js)

```
src/
  app/
    (public)/login, register, forgot
    (dash)/dashboard/page.tsx
    (tenant)/[tenantId]/...
      documents/...
      risks/...
      incidents/...
      training/...
      audits/...
      actions/...
      settings/...
    api/
      uploadthing/route.ts
      webhook/
        resend/route.ts
        clerk/route.ts
  components/
  features/
    documents/ (UI + hooks + server)
    risks/
    incidents/
    training/
    audits/
    actions/
    org/
    goals/
    emergency/
  lib/
    auth.ts  (Clerk/Auth.js helpers)
    casl.ts  (defineAbilities)
    db.ts    (Prisma)
    mail.ts  (Resend)
    pdf.ts   (Playwright)
    queues.ts (BullMQ clients)
    rbac.ts  (role maps)
  server/
    actions/  (server actions per modul)
    jobs/     (BullMQ processors)
  styles/
  types/
  i18n/
```

---

## 5) Datamodell (Prisma – utdrag)

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  orgNumber   String?
  users       UserTenant[]
  documents   Document[]
  risks       Risk[]
  incidents   Incident[]
  trainings   Training[]
  actions     ActionItem[]
  audits      Audit[]
  goals       Goal[]
  chemicals   Chemical[]
  createdAt   DateTime @default(now())
}

model User {
  id        String @id @default(cuid())
  email     String @unique
  name      String?
  // auth sub id (Clerk/Auth.js)
  authId    String @unique
  tenants   UserTenant[]
  createdAt DateTime @default(now())
}

model UserTenant {
  id        String @id @default(cuid())
  userId    String
  tenantId  String
  role      Role
  department String?
  @@unique([userId, tenantId])
  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])
}

enum Role { ADMIN HMS LEADER VERNEOMBUD ANSATT BHT REVISOR }

model Document {
  id        String @id @default(cuid())
  tenantId  String
  kind      DocumentKind // LAW | PROCEDURE | CHECKLIST | FORM | SDS | PLAN
  title     String
  slug      String @unique
  version   String  // v1.3
  status    DocStatus // DRAFT | APPROVED | ARCHIVED
  fileKey   String  // R2 key
  approvedBy String?
  approvedAt DateTime?
  updatedBy  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
}

enum DocumentKind { LAW PROCEDURE CHECKLIST FORM SDS PLAN OTHER }

enum DocStatus { DRAFT APPROVED ARCHIVED }

model Risk {
  id        String @id @default(cuid())
  tenantId  String
  title     String
  context   String // område/arbeidsoppgave/maskin
  likelihood Int
  consequence Int
  score     Int
  ownerId   String // ansvarlig bruker
  measures  Measure[]
  status    RiskStatus @default(OPEN)
  reviewedAt DateTime?
  createdAt DateTime @default(now())
}

enum RiskStatus { OPEN MITIGATING ACCEPTED CLOSED }

model Measure {
  id        String @id @default(cuid())
  tenantId  String
  riskId    String?
  incidentId String?
  auditId   String?
  goalId    String?
  title     String
  dueAt     DateTime
  responsibleId String
  status    ActionStatus @default(PENDING)
  createdAt DateTime @default(now())
}

enum ActionStatus { PENDING IN_PROGRESS DONE OVERDUE }

model Incident {
  id        String @id @default(cuid())
  tenantId  String
  type      IncidentType // AVVIK | NESTEN | SKADE | MILJO | KVALITET
  title     String
  description String
  severity  Int
  occurredAt DateTime
  reportedBy String
  rootCause  String?
  measures   Measure[]
  attachments Attachment[]
  createdAt DateTime @default(now())
}

enum IncidentType { AVVIK NESTEN SKADE MILJO KVALITET }

model Training {
  id        String @id @default(cuid())
  tenantId  String
  userId    String
  courseKey String // f.eks. BRANSJEKURS_K0001
  title     String
  provider  String
  completedAt DateTime?
  validUntil DateTime?
  proofDocKey String?
}

model Audit {
  id        String @id @default(cuid())
  tenantId  String
  title     String
  scope     String
  plannedAt DateTime
  performedAt DateTime?
  findings  AuditFinding[]
  reportKey String?
}

model AuditFinding {
  id      String @id @default(cuid())
  auditId String
  kind    String // avvik | observasjon | forbedringsforslag
  text    String
  action  Measure?
}

model Goal {
  id        String @id @default(cuid())
  tenantId  String
  year      Int
  title     String
  kpi       String?
  target    Float?
  status    String @default("ACTIVE")
}

model Chemical {
  id        String @id @default(cuid())
  tenantId  String
  name      String
  clp       String // H‑setninger
  sdsKey    String // SDS fil
  riskText  String?
}

model Attachment {
  id        String @id @default(cuid())
  tenantId  String
  object    String // f.eks. Incident:123
  fileKey   String  // R2 key
  name      String
  mime      String
  createdAt DateTime @default(now())
}
```

---

## 6) API‑kontrakter (App Router – server actions/route handlers)

**Eksempel: Opprette risikovurdering**

```ts
// server/actions/risk.create.ts
export const createRisk = authAction(
  z.object({
    tenantId: z.string(),
    title: z.string().min(3),
    context: z.string().min(3),
    likelihood: z.number().int().min(1).max(5),
    consequence: z.number().int().min(1).max(5),
  }),
  async (input, ctx) => {
    ability("risk", "create", ctx); // CASL gate
    const score = input.likelihood * input.consequence;
    return prisma.risk.create({ data: { ...input, score, ownerId: ctx.user.id } });
  }
);
```

**Eksempel: Avvik med rotårsaksanalyse**

```ts
export const createIncident = authAction(
  z.object({
    tenantId: z.string(),
    type: z.enum(["AVVIK", "NESTEN", "SKADE", "MILJO", "KVALITET"]),
    title: z.string().min(3),
    description: z.string().min(10),
    severity: z.number().int().min(1).max(5),
    occurredAt: z.coerce.date(),
    rootCause: z.string().optional(),
  }),
  async (input, ctx) => {
    ability("incident", "create", ctx);
    return prisma.incident.create({ data: { ...input, reportedBy: ctx.user.id } });
  }
);
```

**Eksempel: Filopplasting (UploadThing)**

```ts
// app/api/uploadthing/route.ts
export const { GET, POST } = createUploadthing({
  imageUploader: f({ image: { maxFileSize: "8MB" } })
    .middleware(({ req }) => ({ userId: auth().userId }))
    .onUploadComplete(async ({ file, metadata }) => {
      // Persist Attachment with R2 key (file.key)
    }),
});
```

---

## 7) RBAC/ABAC (CASL abilities – eksempel)

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";

export function defineAbilities(user: SessionUser) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.role === "ADMIN" || user.role === "HMS") {
    can("manage", "all", { tenantId: user.tenantId });
  }
  if (user.role === "VERNEOMBUD") {
    can(["read", "create"], ["Incident", "Risk"], { tenantId: user.tenantId });
    can("update", "Risk", { ownerId: user.id });
  }
  if (user.role === "ANSATT") {
    can(["read"], ["Document", "Training"], { tenantId: user.tenantId });
    can(["create"], ["Incident"], { tenantId: user.tenantId });
  }
  cannot("delete", "Document", { kind: "LAW" });
  return build();
}
```

---

## 8) UI‑mønstre (shadcn/ui + RHF + TanStack Query)

* **Liste + detalj** for hver modul (Risiko, Avvik, Dokumenter)
* **Wizard** for ny risikovurdering (trinn: kontekst → farer → matrise → tiltak)
* **Inline tiltak** som «sub‑ressurs» på Risiko/Avvik/Audit/Goal
* **Dashboards**:

  * KPI: åpne avvik, H‑verdi (LTIF), % fullført opplæring, åpne høyrisiko
  * Tabler + filtrering + eksport (CSV/PDF)

---

## 9) Påminnelser & årsplan (BullMQ)

* Repeterende jobber:

  * «Varsle ansvarlig 7 dager før forfall på tiltak»
  * «Send månedsrapport til leder 1. hver måned 08:00»
  * «Årlig gjennomgang av risikovurderinger (batch)»
* Køer: `reminders`, `reports`, `expiry`

---

## 10) PDF‑rapporter (Playwright)

* Maler:

  * **Risikorapport** (header m/tenant, matrise, tiltakstabell)
  * **Avviksrapport** (hendelsesdata, rotårsak, CAPA, signatur)
  * **Ledelsens gjennomgang** (KPI‑snapshot, beslutninger, ansvar)
* Genereres async → lagres i R2 → link i UI

---

## 11) Sikkerhet & compliance

* Tving `tenantId`‑scope i alle queries/mutasjoner
* Server Actions som standard – ikke eksponer raw DB i klient
* Input‑validering med Zod på ALLE mutasjoner
* Audit‑logg (tabell) for sensitive hendelser: login, godkjenning, sletting
* Backup‑policy (R2 + DB‑dump daglig), rotations på nøkler/tokens

---

## 12) «Happy path» – MVP leveranseplan (8–10 uker)

**Uke 1–2**: Auth, tenants, RBAC, designsystem, baseline layout, i18n

**Uke 3**: Dokumentstyring v1 (opplasting, versjon, godkjenning)

**Uke 4**: Risiko v1 (CRUD, matrise, tiltak)

**Uke 5**: Avvik v1 (rapportering mobil, rotårsak, tiltak)

**Uke 6**: Tiltaksplan (samle alt), BullMQ påminnelser

**Uke 7**: Opplæring & kompetanse v1 (kurs, gyldighet, varsler)

**Uke 8**: Revisjon & ledelsens gjennomgang + PDF‑rapporter

**Uke 9–10**: KPI‑dashboards, beredskap, polish, hardening

---

## 13) Environment‑variabler (utdrag)

```
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/hmsnova"
NEXTAUTH_URL=https://app.dittdomene.no
NEXTAUTH_SECRET=…
CLERK_PUBLISHABLE_KEY=…
CLERK_SECRET_KEY=…
UPLOADTHING_SECRET=…
R2_ENDPOINT=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=hmsnova
RESEND_API_KEY=…
UPSTASH_REDIS_REST_URL=…
UPSTASH_REDIS_REST_TOKEN=…
```

---

## 14) Pakker – install (pnpm)

```
pnpm add next react react-dom typescript zod @hookform/resolvers react-hook-form @tanstack/react-query @tanstack/react-query-devtools next-intl class-variance-authority clsx tailwind-merge
pnpm add @uploadthing/react uploadthing
pnpm add @casl/ability @casl/react
pnpm add prisma @prisma/client
pnpm add @clerk/nextjs      # eller: next-auth @auth/core
pnpm add bullmq ioredis
pnpm add resend
pnpm add @react-pdf/renderer playwright # (evt. puppeteer)
```

---

## 15) Minimums‑KPIer (for ledelsens gjennomgang)

* LTIF/H‑verdi (skader m/tapte dager per 1 mill. arbeidstimer)
* Avvik: åpne/lukket per måned,
* Risiko: antall høyrisiko åpne, median tid til lukking tiltak
* Opplæring: % gyldige sertifikater, fornyelser kom. 30/60/90 dager
* Revisjon: planlagt vs. gjennomført, antall funn pr. kategori

---

## 16) Fremtidige integrasjoner

* Altinn (skaderapportering), HMS‑kort API, EcoOnline SDS, Bransjekurs.no (SSO + kursstatus), Powerlog (IoT varsler til Avvik), Inngest (arbeidsflyter for multi‑step godkjenning), Stripe (SaaS‑billing), Unleash (feature‑toggles)

---

## 17) Kvalitetskriterier (DoD)

* 100% skriveoperasjoner valideres av Zod
* Alle mutasjoner autoriseres via CASL + tenant‑scope
* E2E «golden path» tester for Risiko, Avvik, Tiltak
* Tilgjengelighet: WCAG AA (fokus, kontrast, ARIA)
* Sikkerhet: Rate limit på auth og sensitive API
* Dokumentasjon: README + runbooks (backup, nøkkelrotasjon)

---

## 18) UI‑skisser (tekstlig)

* **Dashboard**: 4 KPI‑kort (Avvik åpne, H‑verdi, Tiltak overdue, % kurs gyldige) + nylige hendelser + kommende frister
* **Risiko**: tabell (filter: område, score), «Ny risiko» wizard, detaljside m/tiltak inline og historikk
* **Avvik**: mobilskjema (tittel, type, sted, bilde, alvorlighetsgrad), detaljside m/5‑Why og CAPA
* **Dokumenter**: liste, versjonshistorikk, godkjenning m/e‑sign (Clerk verify)
* **Tiltaksplan**: samlet backlog med Gantt og eier per tiltak

---

**Klar for bygging.** Dette dokumentet kan brukes som direkte blueprint for å spinne opp repo i Cursor/VS Code og starte implementasjon modul for modul.
