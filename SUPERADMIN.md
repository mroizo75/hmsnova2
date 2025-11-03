# HMS Nova 2.0 - Superadmin Guide

## Oversikt

Superadmin-dashboardet er bygget for KKS AS til å administrere alle kundebedrifter (tenants), abonnementer og fakturering i HMS Nova 2.0.

## Tilgang

Kun brukere med `isSuperAdmin: true` har tilgang til `/admin/*` ruter.

**Standard superadmin:**
- E-post: `superadmin@hmsnova.com`
- Passord: `superadmin123`

## Funksjoner

### 1. Dashboard (`/admin`)

Hovedoversikt med nøkkelstatistikk:
- Totalt antall bedrifter og aktive abonnementer
- Ubetalte og forfalte fakturaer
- MRR (Monthly Recurring Revenue) og ARR
- Nylige bedrifter
- Bedrifter med forfalte fakturaer

### 2. Bedriftsadministrasjon (`/admin/tenants`)

Oversikt over alle registrerte bedrifter med:
- **Status**: TRIAL, ACTIVE, SUSPENDED, CANCELLED
- **Abonnement**: Plan, pris og intervall
- **Brukere**: Antall aktive brukere
- **Faktura**: Status på betalinger

#### Opprette ny bedrift

1. Klikk "Ny bedrift"
2. Fyll inn:
   - Bedriftsinformasjon (navn, org.nr, kontakt)
   - Velg abonnementsplan (STARTER, PROFESSIONAL, ENTERPRISE)
   - Pris og faktureringsintervall (månedlig/årlig)
   - Valgfritt: Opprett kunde i Fiken automatisk

#### Bedriftsstatus

- **TRIAL**: 14 dagers prøveperiode
- **ACTIVE**: Aktiv kunde med gyldig abonnement
- **SUSPENDED**: Suspendert (f.eks. ved forfalte fakturaer)
- **CANCELLED**: Kansellert abonnement

### 3. Fakturastyring (`/admin/invoices`)

Oversikt over alle fakturaer med:
- **Status**: PENDING, SENT, PAID, OVERDUE, CANCELLED
- Forfallsdato og betalingsdato
- Beløp og periode
- Kobling til bedrift

#### Synkronisere med Fiken

Klikk "Synkroniser med Fiken" for å:
- Oppdatere fakturastatus fra Fiken
- Sjekke betalinger
- Markere forfalte fakturaer

## Fiken-integrasjon

### Oppsett

Legg til i `.env`:
```env
FIKEN_API_TOKEN=your-api-token-here
FIKEN_COMPANY_SLUG=your-company-slug
```

### Hva synkroniseres?

1. **Kunder**: Automatisk opprettelse av kunde i Fiken ved ny bedrift
2. **Fakturaer**: Status (betalt/ubetalt/forfalt)
3. **Betalinger**: Betalingsdato oppdateres automatisk

### API-funksjoner

Se `src/lib/fiken.ts` for:
- `FikenClient` - API-klient
- `syncInvoiceStatus()` - Synkroniser enkelttenant
- `checkTenantPaymentStatus()` - Sjekk betalingsstatus

## Datamodell

### Tenant
```prisma
model Tenant {
  id             String        @id
  name           String
  orgNumber      String?
  slug           String        @unique
  status         TenantStatus  @default(TRIAL)
  trialEndsAt    DateTime?
  fikenCompanyId String?       @unique
  subscription   Subscription?
  invoices       Invoice[]
  // ... relations
}
```

### Subscription
```prisma
model Subscription {
  id               String
  tenantId         String         @unique
  plan             SubscriptionPlan
  status           SubscriptionStatus
  price            Float
  billingInterval  BillingInterval
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean
}
```

### Invoice
```prisma
model Invoice {
  id              String
  tenantId        String
  fikenInvoiceId  String?       @unique
  invoiceNumber   String?
  amount          Float
  dueDate         DateTime
  paidDate        DateTime?
  status          InvoiceStatus
  period          String?
  description     String?
}
```

## Abonnementsplaner

### STARTER
- Pris: 990 kr/mnd eller 9 900 kr/år
- For små bedrifter (1-10 ansatte)
- Grunnleggende HMS-moduler

### PROFESSIONAL (Anbefalt)
- Pris: 1 990 kr/mnd eller 19 900 kr/år
- For mellomstore bedrifter (10-50 ansatte)
- Alle moduler inkludert

### ENTERPRISE
- Pris: Tilpasset
- For store bedrifter (50+ ansatte)
- Alle moduler + dedikert support

## Arbeidsflyt: Ny kunde

1. **Registrering**
   - Opprett bedrift i `/admin/tenants/new`
   - Status settes til TRIAL (14 dager)
   - Subscription opprettes automatisk

2. **Prøveperiode**
   - Kunde kan teste alle funksjoner
   - Få automatisk varsel 3 dager før prøveperiode utløper

3. **Aktivering**
   - Etter godkjenning: Endre status til ACTIVE
   - Opprett første faktura manuelt eller via Fiken
   - Send velkomst-e-post med faktura

4. **Løpende fakturering**
   - Automatisk fakturagenerering (via BullMQ-jobb senere)
   - Synkroniser med Fiken månedlig
   - Varsle om forfalte betalinger

## Automatisering (TODO)

Planlagte jobber (BullMQ):
- Månedlig fakturagenerering
- Daglig synkronisering med Fiken
- E-postvarsler for forfalte fakturaer
- Automatisk suspensjon ved 14 dager forfalt
- Prøveperiode-varsler

## Sikkerhet

- Kun brukere med `isSuperAdmin: true` har tilgang
- Middleware sjekker ved hver request
- Audit logging av alle endringer (TODO)
- API-nøkler må aldri eksponeres til klienten

## Navigasjon

Superadmin-meny:
- **Oversikt** - Dashboard med statistikk
- **Bedrifter** - Administrer tenants
- **Fakturaer** - Fakturaoversikt
- **Brukere** - Brukeradministrasjon (TODO)
- **Innstillinger** - System-innstillinger (TODO)

## Tips & beste praksis

1. **Synkroniser regelmessig**: Kjør Fiken-synk ukentlig
2. **Følg opp forfalte**: Kontakt kunder med forfalte fakturaer innen 7 dager
3. **Trial-oppfølging**: Ring kunde dag 7 og dag 12 i prøveperioden
4. **Dokumenter beslutninger**: Bruk notater-felt (kommer)
5. **Backup**: Eksporter data månedlig (kommer)

## Support

For spørsmål om superadmin-funksjoner:
- Se `src/app/(superadmin)/admin/` for kode
- Se `src/server/actions/tenant.actions.ts` for server-logikk
- Se `src/lib/fiken.ts` for Fiken-integrasjon

---

**Sist oppdatert**: 31. oktober 2025

