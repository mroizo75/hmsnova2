# 📋 HMS Nova - Digital Skjemamodul

## 🎯 Visjon
De fleste HMS-systemer mangler digitale skjemaer - alt er manuelt papirbasert eller må lastes opp som PDF.
HMS Nova skal ha en komplett skjemabygger der admin kan lage egne skjemaer som brukere fyller ut digitalt.

## ✨ Funksjonalitet

### 1. **Skjemabygger (Admin)**
- Drag-and-drop interface for å bygge skjemaer
- Felttyper:
  - ✅ Kort tekst (input)
  - 📝 Lang tekst (textarea)
  - 🔢 Tall (number)
  - 📅 Dato (date)
  - ⏰ Dato + tid (datetime)
  - ☑️ Avkrysning (checkbox)
  - 🔘 Flervalg (radio)
  - 📋 Dropdown (select)
  - 📎 Filopplasting
  - ✍️ Signatur (digital)
- Felt-innstillinger:
  - Påkrevd/valgfritt
  - Valideringsregler
  - Standardverdi
  - Hjelpetekst
- Betinget logikk: Vis felt X hvis felt Y = "Ja"
- Mal-bibliotek (HMS morgenmøte, Avviksrapport, Risikovurdering, etc.)

### 2. **Skjemautfylling (Bruker)**
- Liste over tilgjengelige skjemaer for brukeren
- Kladd-funksjon (lagre underveis)
- Validering før innsending
- Digital signatur med BankID (fremtidig) eller bruker-login
- Vedlegg/bilder (mobilkamera)

### 3. **Signatur & Godkjenning**
- Automatisk signering ved innsending:
  - Brukerens navn
  - E-post
  - Tidspunkt
  - IP-adresse (valgfritt)
- To-stegs godkjenning (bruker fyller ut → leder godkjenner)
- Sporbarhet (hvem fylte ut, hvem godkjente, når)

### 4. **Gjentakende Skjemaer (Recurring Forms)**
- **HMS morgenmøte:** Daglig kl. 07:00
- **Ukerapport:** Hver fredag
- **Månedlig HMS-inspeksjon:** Første mandag i måneden
- Automatiske påminnelser (e-post/push)
- Oversikt over manglende utfyllinger

### 5. **Rapporter & Historikk**
- Søk og filtrer alle innsendte skjemaer
- Eksport til PDF (med logo og signatur)
- Excel-eksport for analyse
- Audit trail (full historikk over endringer)
- Dashboard: "3 av 5 morgenmøter gjennomført denne uken"

### 6. **Integrasjoner**
- Automatisk opprett avvik fra skjema (f.eks. hvis "Farlig situasjon observert?" = Ja)
- Knytt skjema til prosjekt/lokasjon
- E-post notifikasjoner til leder ved kritiske svar

## 📊 Databasestruktur (Prisma)

### FormTemplate (Skjemamal)
```prisma
model FormTemplate {
  id              String            @id @default(cuid())
  tenantId        String
  title           String            // "HMS Morgenmøte"
  description     String?
  category        FormCategory      @default(CUSTOM)
  isActive        Boolean           @default(true)
  requiresSignature Boolean         @default(true)
  requiresApproval Boolean          @default(false)
  isRecurring     Boolean           @default(false)
  recurrenceRule  Json?             // RRULE format (daglig/ukentlig/månedlig)
  createdBy       String
  fields          FormField[]
  submissions     FormSubmission[]
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator         User              @relation("CreatedForms", fields: [createdBy], references: [id])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum FormCategory {
  MEETING       // Møtereferater
  INSPECTION    // Inspeksjoner
  INCIDENT      // Hendelsesrapporter
  RISK          // Risikovurderinger
  TRAINING      // Opplæring
  CHECKLIST     // Sjekklister
  CUSTOM        // Egendefinert
}
```

### FormField (Felt i skjemaet)
```prisma
model FormField {
  id              String        @id @default(cuid())
  formTemplateId  String
  fieldType       FieldType
  label           String        // "Var det noen farlige situasjoner?"
  helpText        String?       // "Beskriv kort hva som skjedde"
  placeholder     String?
  isRequired      Boolean       @default(false)
  order           Int           // For sortering (1, 2, 3...)
  validation      Json?         // { min: 5, max: 100, pattern: "..." }
  options         Json?         // For dropdown/radio: ["Ja", "Nei", "Vet ikke"]
  conditionalLogic Json?        // Vis hvis felt X = Y
  formTemplate    FormTemplate  @relation(fields: [formTemplateId], references: [id], onDelete: Cascade)
  values          FormFieldValue[]
  createdAt       DateTime      @default(now())
}

enum FieldType {
  TEXT          // Kort tekst
  TEXTAREA      // Lang tekst
  NUMBER        // Tall
  DATE          // Dato
  DATETIME      // Dato + tid
  CHECKBOX      // Ja/Nei
  RADIO         // Radioknapper
  SELECT        // Dropdown
  FILE          // Filopplasting
  SIGNATURE     // Digital signatur
}
```

### FormSubmission (Innsendt skjema)
```prisma
model FormSubmission {
  id              String            @id @default(cuid())
  formTemplateId  String
  tenantId        String
  submittedById   String
  status          SubmissionStatus  @default(DRAFT)
  signedAt        DateTime?
  approvedById    String?
  approvedAt      DateTime?
  fieldValues     FormFieldValue[]
  metadata        Json?             // IP, user agent, location, etc.
  formTemplate    FormTemplate      @relation(fields: [formTemplateId], references: [id], onDelete: Cascade)
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  submittedBy     User              @relation("SubmittedForms", fields: [submittedById], references: [id])
  approvedBy      User?             @relation("ApprovedForms", fields: [approvedById], references: [id])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum SubmissionStatus {
  DRAFT         // Kladd (ikke sendt inn)
  SUBMITTED     // Sendt inn, venter godkjenning
  APPROVED      // Godkjent av leder
  REJECTED      // Avvist
}
```

### FormFieldValue (Brukerens svar)
```prisma
model FormFieldValue {
  id              String          @id @default(cuid())
  submissionId    String
  fieldId         String
  value           String?         // JSON string for komplekse verdier
  fileKey         String?         // Hvis file upload
  submission      FormSubmission  @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  field           FormField       @relation(fields: [fieldId], references: [id])
}
```

## 🗂️ Mappestruktur

```
src/
├── features/
│   └── forms/
│       ├── components/
│       │   ├── form-builder/          # Admin: Skjemabygger
│       │   │   ├── form-builder.tsx
│       │   │   ├── field-editor.tsx
│       │   │   ├── field-type-selector.tsx
│       │   │   └── field-preview.tsx
│       │   ├── form-filler/           # Bruker: Skjemautfylling
│       │   │   ├── form-viewer.tsx
│       │   │   ├── field-renderer.tsx
│       │   │   ├── signature-pad.tsx
│       │   │   └── form-progress.tsx
│       │   ├── form-list.tsx          # Liste over skjemaer
│       │   ├── submission-list.tsx    # Innsendte skjemaer
│       │   └── submission-detail.tsx  # Detaljer om innsendt skjema
│       ├── schemas/
│       │   ├── form-template.schema.ts
│       │   └── form-submission.schema.ts
│       └── utils/
│           ├── form-validator.ts
│           ├── recurrence.ts          # RRULE parsing
│           └── pdf-export.ts
├── server/
│   └── actions/
│       ├── form-template.actions.ts
│       └── form-submission.actions.ts
└── app/
    └── (dashboard)/
        └── dashboard/
            └── forms/
                ├── page.tsx                    # Liste over tilgjengelige skjemaer
                ├── new/
                │   └── page.tsx                # Opprett nytt skjema (admin)
                ├── [templateId]/
                │   ├── page.tsx                # Skjemabygger (admin)
                │   ├── fill/
                │   │   └── page.tsx            # Fyll ut skjema (bruker)
                │   └── submissions/
                │       ├── page.tsx            # Liste over innsendte skjemaer
                │       └── [submissionId]/
                │           └── page.tsx        # Detaljer om innsendt skjema
                └── templates/
                    └── page.tsx                # Malbibliotek
```

## 🎨 UI/UX Skisser

### Skjemabygger (Admin)
```
┌─────────────────────────────────────────────────────────┐
│  Nytt Skjema: HMS Morgenmøte                    [Lagre] │
├─────────────────────────────────────────────────────────┤
│  Tittel: HMS Morgenmøte                                 │
│  Beskrivelse: Daglig morgenmøte for HMS-oppfølging      │
│  Kategori: [Meeting ▼]                                  │
│  ☑ Krever signatur  ☑ Krever godkjenning               │
│  ☑ Gjentakende  Frekvens: [Daglig ▼]  Kl: [07:00]     │
├─────────────────────────────────────────────────────────┤
│  Felttyper (dra og slipp):                              │
│  [📝 Tekst] [🔢 Tall] [📅 Dato] [☑️ Avkrysning]        │
│  [🔘 Flervalg] [📋 Dropdown] [📎 Fil] [✍️ Signatur]   │
├─────────────────────────────────────────────────────────┤
│  Skjemaforhåndsvisning:                                 │
│  ┌───────────────────────────────────────────────┐     │
│  │ 1. Dato for møte *                             │     │
│  │    [📅 ____________________]        [⚙️] [🗑️] │     │
│  │                                                │     │
│  │ 2. Antall deltakere *                          │     │
│  │    [🔢 ____________________]        [⚙️] [🗑️] │     │
│  │                                                │     │
│  │ 3. Var det farlige situasjoner? *              │     │
│  │    ⚪ Ja  ⚪ Nei                    [⚙️] [🗑️] │     │
│  │                                                │     │
│  │ [+ Legg til felt]                              │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Skjemautfylling (Bruker)
```
┌─────────────────────────────────────────────────────────┐
│  HMS Morgenmøte - 31. oktober 2025                      │
│  Progresjon: ████████░░ 80%                             │
├─────────────────────────────────────────────────────────┤
│  1. Dato for møte *                                     │
│     [31.10.2025          ]                              │
│                                                          │
│  2. Antall deltakere *                                  │
│     [12                  ]                              │
│                                                          │
│  3. Var det farlige situasjoner? *                      │
│     ⚫ Ja  ⚪ Nei                                        │
│                                                          │
│  4. Beskriv situasjonen (vises kun hvis Ja)             │
│     [________________________]                          │
│     [________________________]                          │
│                                                          │
│  5. Vedlegg (valgfritt)                                 │
│     [📎 Last opp fil eller ta bilde]                    │
│                                                          │
│  ✍️ Digital signatur:                                   │
│     Du signerer som: Ola Nordmann (ola@firma.no)       │
│     Tidspunkt: 31.10.2025 07:15                         │
│                                                          │
│     [Lagre kladd]  [Send inn]                           │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Implementasjonsplan

### Fase 1: Database & Backend (MVP)
- [ ] Legg til Prisma-modeller
- [ ] Lag server actions for CRUD
- [ ] Implementer grunnleggende validering

### Fase 2: Skjemabygger (Admin)
- [ ] Form builder UI (enkel versjon først)
- [ ] Felttyper: Tekst, tall, dato, checkbox, textarea
- [ ] Lagre og publiser skjemamal

### Fase 3: Skjemautfylling (Bruker)
- [ ] Vis tilgjengelige skjemaer
- [ ] Dynamisk rendering av felt
- [ ] Validering ved innsending
- [ ] Kladd-funksjon

### Fase 4: Signatur & Godkjenning
- [ ] Digital signatur (brukerens login + timestamp)
- [ ] To-stegs godkjenning (hvis påkrevd)
- [ ] Audit trail

### Fase 5: Gjentakende Skjemaer
- [ ] RRULE-parsing (daglig/ukentlig/månedlig)
- [ ] BullMQ job for å sende påminnelser
- [ ] Dashboard: "3 av 5 morgenmøter fullført"

### Fase 6: Rapporter & Eksport
- [ ] PDF-eksport med signatur
- [ ] Excel-eksport
- [ ] Søk og filtrering

### Fase 7: Avansert (V2)
- [ ] Drag-and-drop form builder (React DnD)
- [ ] Betinget logikk (if/then rules)
- [ ] Malbibliotek (ferdiglagde skjemaer)
- [ ] BankID-signatur (Norge)
- [ ] Mobil-app (React Native)

## 💡 Brukseksempler

### Eksempel 1: HMS Morgenmøte
```yaml
Tittel: HMS Morgenmøte
Frekvens: Daglig kl. 07:00
Felt:
  - Dato (auto-utfylt)
  - Antall deltakere (tall)
  - Farlige situasjoner observert? (Ja/Nei)
  - Hvis Ja: Beskriv (textarea)
  - Sikkerhetsutstyr OK? (checkbox)
  - Kommentarer (textarea, valgfritt)
  - Signatur (påkrevd)
Godkjenning: Formann må godkjenne
```

### Eksempel 2: Avviksrapport
```yaml
Tittel: Avviksrapport
Frekvens: Ad-hoc (ved behov)
Felt:
  - Dato og tid for hendelse
  - Type avvik (dropdown: Sikkerhet, Miljø, Kvalitet)
  - Alvorlighetsgrad (radio: Lav, Middels, Høy, Kritisk)
  - Beskrivelse (textarea)
  - Årsak (textarea)
  - Forslag til tiltak (textarea)
  - Bilde av situasjonen (filopplasting)
  - Signatur (påkrevd)
Automatikk: Opprett Avvik i systemet hvis alvorlighetsgrad = Høy/Kritisk
```

### Eksempel 3: Ukentlig HMS-inspeksjon
```yaml
Tittel: Ukentlig HMS-inspeksjon
Frekvens: Hver fredag kl. 14:00
Felt:
  - Brannslukningsapparat sjekket? (Ja/Nei)
  - Nødutganger frie? (Ja/Nei)
  - Førstehjelpsutstyr komplett? (Ja/Nei)
  - Kjemikalier lagret riktig? (Ja/Nei)
  - Avvik funnet? (Ja/Nei)
  - Hvis Ja: Beskriv avvik (textarea)
  - Bilder (filopplasting, valgfritt)
  - Signatur (påkrevd)
Godkjenning: HMS-leder må godkjenne
```

## 🏆 Konkurransefordel
De fleste HMS-systemer (SafetySync, Isafety, Easyweb, etc.) har IKKE denne funksjonaliteten.
De må laste opp papirskjemaer som PDF eller bruke eksterne verktøy som Google Forms.

**HMS Nova blir den første norske HMS-løsningen med komplett digital skjemamodul!**

## 📝 Notater
- Bruk React Hook Form for skjemahåndtering
- Validering med Zod (gjenbruk av eksisterende setup)
- PDF-generering: Playwright/Puppeteer (allerede planlagt)
- Signatur: HTML5 Canvas eller bibliotek som `react-signature-canvas`
- RRULE: Bruk `rrule` npm-pakken for gjentakende skjemaer
- Notifikasjoner: BullMQ (allerede planlagt) + Resend (e-post)

---

## ✅ Status: Grunnlag lagt

### Ferdigstilt (31. oktober 2025)

✅ **Database-modeller:**
  - `FormTemplate` - Skjemamaler
  - `FormField` - Felt i skjemaet
  - `FormSubmission` - Innsendte skjemaer
  - `FormFieldValue` - Brukerens svar
  - Alle modeller lagt til i `prisma/schema.prisma`

✅ **Mappestruktur opprettet:**
  - `src/features/forms/components/form-builder/`
  - `src/features/forms/components/form-filler/`
  - `src/features/forms/schemas/`
  - `src/features/forms/utils/`
  - `src/app/(dashboard)/dashboard/forms/`

✅ **Zod-schemas:**
  - `form-template.schema.ts` - Validering for skjemamaler
  - `form-submission.schema.ts` - Validering for innsendte skjemaer

✅ **Placeholder-side:**
  - `/dashboard/forms` - Viser "under utvikling" med feature-liste

✅ **Navigasjon:**
  - "Skjemaer" lagt til i dashboard-meny

✅ **Dokumentasjon:**
  - `FORMS.md` - Komplett spesifikasjon
  - `src/features/forms/README.md` - Moduloversikt

### Neste steg når du vil implementere

1. **Backend:**
   - `src/server/actions/form-template.actions.ts`
   - `src/server/actions/form-submission.actions.ts`
   - Kjør `npm run db:push` for å oppdatere database

2. **Form Builder (Admin):**
   - Drag-and-drop felttyper
   - Forhåndsvisning av skjema
   - Lagre og publiser skjemamal

3. **Form Filler (Bruker):**
   - Dynamisk rendering av felt
   - Validering
   - Digital signatur

4. **Gjentakende skjemaer:**
   - RRULE-parsing
   - BullMQ-jobber for påminnelser

---

**Status:** 🔵 Grunnlag lagt - Klar for implementering
**Prioritet:** ⭐⭐⭐⭐⭐ (Høy - konkurransefordel!)
**Estimert tid:** 3-4 uker for MVP (Fase 1-4)
**Sist oppdatert:** 31. oktober 2025 av Kenneth

