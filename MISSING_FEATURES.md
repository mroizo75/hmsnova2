# 🚀 HMS Nova - Manglende Funksjoner & Forbedringer

**Generert:** 2025-11-04  
**Status:** Core features implementert, flere moduler mangler

---

## 📊 Implementeringsstatus

| Modul | Status | Prioritet | Estimat |
|-------|--------|-----------|---------|
| **Autentisering** | 🟢 80% | Kritisk | 10t |
| **Dokumentstyring** | 🟢 90% | Kritisk | 5t |
| **Risikovurdering** | 🟢 85% | Kritisk | 8t |
| **Avvik & Hendelser** | 🟢 90% | Kritisk | 5t |
| **Opplæring** | 🟢 75% | Høy | 12t |
| **HMS-Mål** | 🟢 70% | Høy | 10t |
| **Revisjoner (Audits)** | 🟡 50% | Høy | 24t |
| **Vernerunde** | 🔴 0% | Høy | 32t |
| **Stoffkartotek** | 🟡 40% | Medium | 16t |
| **Ledelsens gjennomgang** | 🔴 0% | Medium | 24t |
| **AMU/VO** | 🔴 0% | Medium | 16t |
| **Varsling (anonymous)** | 🔴 0% | Medium | 20t |
| **Mobile app** | 🔴 0% | Lav | 160t+ |

**Totalt implementert:** ~65%  
**Gjenstående arbeid:** ~340 timer

---

## 🔴 KRITISK - Manglende Core Features

### 1. **Password Reset Funksjonalitet**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🔴 KRITISK

**Hva mangler:**
- "Glemt passord" link på login-siden
- Email med reset token
- Reset passord side
- Token validering og utløp

**Implementering:**
```bash
# Ny tabell for reset tokens
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expires   DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([userId])
}
```

**Estimat:** 8-10 timer

---

### 2. **Email Verification**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🟠 HØY

**Hva mangler:**
- Email verification etter registrering
- Resend verification email
- Blokkere innlogging før email er verifisert

**Implementering:**
- NextAuth har `emailVerified` felt
- Send verification email ved registrering
- Block access før verified

**Estimat:** 6-8 timer

---

### 3. **Vernerunde Modul**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🟠 HØY (Lovpålagt!)

**Hva mangler:**
- Planlegge vernerunder
- Digital vernerunde-skjema
- Ta bilder under inspeksjon
- Registrere avvik direkte
- Generere rapport (PDF)
- Oppfølging av tiltak

**Database schema:**
```prisma
model Inspection {
  id              String            @id @default(cuid())
  tenantId        String
  title           String
  description     String?           @db.Text
  type            InspectionType    // VERNERUNDE, HMS_INSPEKSJON, BRANNØVELSE, etc.
  status          InspectionStatus  @default(PLANNED)
  scheduledDate   DateTime
  completedDate   DateTime?
  location        String?
  conductedBy     String            // userId
  participants    String?           @db.Text // JSON array of userIds
  findings        InspectionFinding[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([scheduledDate])
  @@index([status])
}

model InspectionFinding {
  id            String           @id @default(cuid())
  inspectionId  String
  title         String
  description   String           @db.Text
  severity      Int              // 1-5
  location      String?
  imageKeys     String?          @db.Text // JSON array of R2 keys
  status        FindingStatus    @default(OPEN)
  responsibleId String?
  dueDate       DateTime?
  resolvedAt    DateTime?
  createdAt     DateTime         @default(now())
  
  inspection Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  
  @@index([inspectionId])
  @@index([status])
}

enum InspectionType {
  VERNERUNDE
  HMS_INSPEKSJON
  BRANNØVELSE
  SHA_PLAN
  ANDRE
}

enum InspectionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum FindingStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

**Features:**
1. **Mobile-first UI** - Bruk på byggeplass
2. **Offline support** - Service worker cache
3. **Camera integration** - Ta bilder direkte
4. **Voice-to-text** - Dikter funn
5. **Location tagging** - GPS koordinater
6. **Digital signatures** - Bekreft gjennomføring
7. **Auto PDF generation** - Rapport med bilder

**Estimat:** 32-40 timer

---

### 4. **Revisjoner - Full Implementering**
**Status:** 🟡 50% (Grunnstruktur finnes, mangler UI/logikk)  
**Prioritet:** 🟠 HØY (ISO 9001 krav)

**Hva finnes:**
- ✅ Database schema (Audit tabell)
- ✅ Grunnleggende CRUD

**Hva mangler:**
- ❌ Planlegge revisjonskalender
- ❌ Sjekklister for revisjoner
- ❌ Funn og avvik fra revisjoner
- ❌ Korrigerende tiltak tracking
- ❌ Revisjonsrapport generering
- ❌ Dashboard for revisjonstatus

**Implementering:**
```prisma
model Audit {
  id                String        @id @default(cuid())
  tenantId          String
  title             String
  type              AuditType     @default(INTERN)
  scope             String        @db.Text
  standard          String?       // ISO 9001, ISO 14001, etc.
  scheduledDate     DateTime
  completedDate     DateTime?
  status            AuditStatus   @default(PLANNED)
  auditorIds        String        @db.Text // JSON array
  auditeeIds        String        @db.Text // JSON array
  findings          AuditFinding[]
  summary           String?       @db.Text
  recommendations   String?       @db.Text
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([scheduledDate])
  @@index([status])
}

model AuditFinding {
  id              String         @id @default(cuid())
  auditId         String
  clauseReference String?        // ISO 9001 - 8.5.1
  finding         String         @db.Text
  severity        FindingSeverity @default(OBSERVATION)
  evidence        String?        @db.Text
  correctiveAction String?       @db.Text
  responsibleId   String?
  dueDate         DateTime?
  status          FindingStatus  @default(OPEN)
  resolvedAt      DateTime?
  createdAt       DateTime       @default(now())
  
  audit Audit @relation(fields: [auditId], references: [id], onDelete: Cascade)
  
  @@index([auditId])
  @@index([status])
}

enum AuditType {
  INTERN
  EKSTERN
  SERTIFISERING
  OPPFØLGING
}

enum AuditStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum FindingSeverity {
  MAJOR_NC          // Major Non-Conformity
  MINOR_NC          // Minor Non-Conformity
  OBSERVATION       // Observation/Forbedring
}
```

**Estimat:** 24-32 timer

---

## 🟡 VIKTIG - Manglende Features

### 5. **Stoffkartotek (Kjemikalier) - Full Implementering**
**Status:** 🟡 40% (Database finnes, mangler UI)  
**Prioritet:** 🟠 HØY (Lovpålagt for bedrifter med kjemikalier)

**Hva finnes:**
- ✅ Database schema (Chemical tabell)
- ✅ Grunnleggende CRUD actions

**Hva mangler:**
- ❌ Komplett UI for å legge til kjemikalier
- ❌ Last opp og vis sikkerhetsdatablad (SDS/FDV)
- ❌ Faresymboler og merking
- ❌ Eksponeringskontroll
- ❌ Erstattingsvurdering
- ❌ Kjemikalieregister rapport
- ❌ Varsling om utgående SDS

**Implementering:**
```prisma
model Chemical {
  id                  String           @id @default(cuid())
  tenantId            String
  productName         String
  supplier            String?
  articleNumber       String?
  casNumber           String?
  hazardSymbols       String?          @db.Text // JSON array
  hazardStatements    String?          @db.Text // H-setninger
  precautions         String?          @db.Text // P-setninger
  storageLocation     String?
  maxQuantity         Float?
  unit                String?          @default("liter")
  sdsFileKey          String?          // R2 key til sikkerhetsdatablad
  sdsVersion          String?
  sdsDate             DateTime?
  sdsExpiresAt        DateTime?
  exposureLimit       Float?
  exposureUnit        String?
  substitutionAssessed Boolean         @default(false)
  substitutionNotes   String?          @db.Text
  status              ChemicalStatus   @default(ACTIVE)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([status])
  @@index([sdsExpiresAt])
}

enum ChemicalStatus {
  ACTIVE
  PHASING_OUT
  DISCONTINUED
}
```

**Features:**
1. Upload sikkerhetsdatablad (PDF)
2. Automatisk parsing av FDV (AI-assisted)
3. Faresymboler fra GHS
4. Eksponeringskontroll
5. Erstattingsvurdering workflow
6. Lagerstyring (inn/ut)
7. Varsling om utløpende SDS
8. Kjemikalieregister rapport (Excel/PDF)

**Estimat:** 16-20 timer

---

### 6. **Ledelsens Gjennomgang (Management Review)**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🟡 MEDIUM (ISO 9001 - 9.3)

**Hva mangler:**
- Planlegge ledelsens gjennomgang
- Agenda og forberedelse
- KPI dashboard for gjennomgang
- Beslutninger og tiltak
- Protokoll og dokumentasjon
- Oppfølging av forrige gjennomgang

**Database schema:**
```prisma
model ManagementReview {
  id                String             @id @default(cuid())
  tenantId          String
  title             String
  scheduledDate     DateTime
  completedDate     DateTime?
  status            ReviewStatus       @default(PLANNED)
  participants      String             @db.Text // JSON array of userIds
  agenda            String?            @db.Text
  kpiData           String?            @db.Text // JSON med KPI-er
  decisions         ReviewDecision[]
  protocols         String?            @db.Text
  nextReviewDate    DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([scheduledDate])
}

model ReviewDecision {
  id                String             @id @default(cuid())
  reviewId          String
  decision          String             @db.Text
  rationale         String?            @db.Text
  responsibleId     String?
  dueDate           DateTime?
  status            DecisionStatus     @default(OPEN)
  completedAt       DateTime?
  createdAt         DateTime           @default(now())
  
  review ManagementReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  
  @@index([reviewId])
  @@index([status])
}

enum ReviewStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
}

enum DecisionStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

**Features:**
1. Automatisk KPI-samling fra systemet
2. Trendanalyse (siste år)
3. Revisjoner siden forrige gjennomgang
4. Avvik og hendelser statistikk
5. HMS-mål oppfyllelse
6. Ressursbehov
7. Digital protokoll med signatur
8. Action items tracking

**Estimat:** 24-32 timer

---

### 7. **AMU/VO (Arbeidsmiljøutvalg/Verneombud)**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🟡 MEDIUM (Lovpålagt)

**Hva mangler:**
- Organisasjonskart med AMU/VO
- AMU møter (agenda, protokoll, beslutninger)
- VO-saker og oppfølging
- Varsling til VO ved hendelser
- AMU dashboard

**Database schema:**
```prisma
model SafetyCommittee {
  id          String              @id @default(cuid())
  tenantId    String
  type        CommitteeType       @default(AMU)
  name        String
  chairId     String              // userId
  secretaryId String?             // userId
  members     String              @db.Text // JSON array of userIds
  meetings    CommitteeMeeting[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
}

model CommitteeMeeting {
  id            String           @id @default(cuid())
  committeeId   String
  title         String
  scheduledDate DateTime
  location      String?
  agenda        String?          @db.Text
  protocol      String?          @db.Text
  attendees     String           @db.Text // JSON array
  decisions     String?          @db.Text // JSON array
  status        MeetingStatus    @default(PLANNED)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  
  committee SafetyCommittee @relation(fields: [committeeId], references: [id], onDelete: Cascade)
  
  @@index([committeeId])
  @@index([scheduledDate])
}

enum CommitteeType {
  AMU
  VO
  BHT
}

enum MeetingStatus {
  PLANNED
  COMPLETED
  CANCELLED
}
```

**Estimat:** 16-20 timer

---

### 8. **Anonymous Varsling (Whistleblower)**
**Status:** ❌ Ikke implementert  
**Prioritet:** 🟡 MEDIUM (Viktig for compliance)

**Hva mangler:**
- Anonymous whistleblower channel
- Kryptert kommunikasjon
- Case tracking uten identifikasjon
- Admin interface for håndtering
- Status updates til whistleblower

**Sikkerhet:**
- Ingen IP logging
- Kryptert database felt
- Unik anonym ID for hver sak
- Secure messaging

**Estimat:** 20-24 timer

---

## 🔵 FORBEDRINGER - Nice-to-have

### 9. **Dashboard Forbedringer**
**Hva mangler:**
- Real-time statistikk (WebSockets)
- Bedre grafer (Chart.js/Recharts)
- Eksport til Excel/PDF
- Sammenligning med forrige periode
- Predictive analytics (ML)

**Estimat:** 16-24 timer

---

### 10. **Notifications System**
**Hva mangler:**
- In-app notifications
- Email digests
- Push notifications
- Notification preferences
- Seen/unseen tracking

**Estimat:** 12-16 timer

---

### 11. **Advanced Søk & Filter**
**Hva mangler:**
- Global søk på tvers av moduler
- Avanserte filtre
- Lagrede søk
- Full-text search (Elasticsearch/Meilisearch)

**Estimat:** 20-32 timer

---

### 12. **Mobile App (PWA eller Native)**
**Hva mangler:**
- Alt!

**Scope:**
- PWA med offline support
- Push notifications
- Camera integration
- Geolocation
- QR code scanning (for utstyr)
- Digital signaturer

**Estimat:** 160-240 timer (Full native app)  
**Alternativ:** Progressive Web App (PWA) - 80-120 timer

---

### 13. **Integrasjoner**
**Hva mangler:**
- Altinn integration (automatisk henting av org-info)
- BankID pålogging
- Active Directory/LDAP sync
- Slack/Teams notifications
- Calendar integration (Outlook/Google)

**Estimat:**
- BankID: 24-32 timer
- Altinn: 16-24 timer
- AD/LDAP: 12-16 timer
- Slack/Teams: 8-12 timer
- Calendar: 8-12 timer

---

### 14. **AI-Assistert Funksjoner**
**Ideer:**
- Automatisk risikovurdering (AI forslag)
- Smart document search
- Trend detection i avvik
- Predictive maintenance alerts
- Auto-kategorisering av hendelser

**Estimat:** 40-80 timer (avhengig av scope)

---

### 15. **White-Label Support**
**For SaaS:**
- Custom branding per tenant
- Custom domain support
- Logo/color customization
- Email branding
- Custom terms/privacy

**Estimat:** 32-48 timer

---

## 📊 PRIORITERT ROADMAP

### Q1 2025 (Januar-Mars)
**Mål:** Production-ready core features

- ✅ Password Reset (8-10t)
- ✅ Email Verification (6-8t)
- ✅ Vernerunde Modul (32-40t)
- ✅ Revisjoner Full Implementering (24-32t)
- ✅ Stoffkartotek UI (16-20t)

**Totalt:** 86-110 timer (~2-3 uker)

---

### Q2 2025 (April-Juni)
**Mål:** Compliance & Management features

- ✅ Ledelsens Gjennomgang (24-32t)
- ✅ AMU/VO Modul (16-20t)
- ✅ Anonymous Varsling (20-24t)
- ✅ Dashboard Forbedringer (16-24t)
- ✅ Notifications System (12-16t)

**Totalt:** 88-116 timer (~2-3 uker)

---

### Q3 2025 (Juli-September)
**Mål:** User experience & integrations

- ✅ Advanced Search (20-32t)
- ✅ BankID Integration (24-32t)
- ✅ Mobile PWA (80-120t)
- ✅ Altinn Integration (16-24t)

**Totalt:** 140-208 timer (~3-5 uker)

---

### Q4 2025 (Oktober-Desember)
**Mål:** Innovation & scaling

- ✅ AI-Assistert Funksjoner (40-80t)
- ✅ White-Label Support (32-48t)
- ✅ Advanced Analytics (24-32t)
- ✅ Performance Optimization (16-24t)

**Totalt:** 112-184 timer (~3-5 uker)

---

## 🎯 KONKLUSJON

HMS Nova har implementert **~65% av core features**, men det gjenstår betydelig arbeid:

### Umiddelbare behov (Q1):
- ✅ **Vernerunde** (lovpålagt!)
- ✅ **Full Revisjoner** (ISO 9001)
- ✅ **Stoffkartotek UI** (lovpålagt)
- ✅ **Password Reset** (kritisk UX)

### Total gjenstående arbeid:
**~530-620 timer** (13-15 uker full-time)

### Anbefaling:
1. **Fokuser på Q1-features først** (production-ready)
2. **Test grundig** etter hver fase
3. **Få bruker-feedback** tidlig
4. **Prioriter basert på kunde-behov**

---

**Oppdatert:** 2025-11-04  
**Ansvarlig:** Kenneth / Development Team  
**Neste review:** Etter Q1 completion

