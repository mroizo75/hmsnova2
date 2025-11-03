# 🎓 Opplæring og Kompetanse - ISO 9001 Compliant

Komplett løsning for kompetansestyring i henhold til ISO 9001 - 7.2 Kompetanse.

## ✅ ISO 9001 - 7.2 Krav (Under implementering)

### a) Bestemme nødvendig kompetanse
✅ **Definere kompetansekrav:**
- Standard HMS-kurs definert i systemet
- Obligatoriske kurs kan merkes
- Kompetansematrise viser hvem som har hva

### b) Sikre kompetanse
✅ **Dokumentere kompetanse:**
- Registrere opplæring basert på utdanning, opplæring eller erfaring
- Last opp sertifikat/kursbevis som dokumentert bevis
- Gyldighetsperiode for kurs som må fornyes

### c) Anskaffe og evaluere
✅ **Evaluere effektivitet:**
- Evaluering av om opplæringen har hatt ønsket effekt
- Ansvarlig for evaluering dokumenteres
- Kontinuerlig forbedring basert på evaluering

### d) Dokumentert informasjon
✅ **Bevare bevis:**
- Full historikk over all opplæring
- Sertifikater/kursbevis lagres sikkert
- Audit trail på alle endringer
- Påminnelser om fornyelse

---

## 🚀 Implementert

### Database Model (Prisma)
```prisma
model Training {
  id              String    @id
  tenantId        String
  userId          String    // Hvem som tok kurset
  courseKey       String    // Unik ID (f.eks. "first-aid")
  title           String    // "Førstehjelp grunnkurs"
  provider        String    // "Røde Kors", "BHT", "Internt"
  description     String?
  completedAt     DateTime? // ISO 9001: Når fullført
  validUntil      DateTime? // Utløpsdato (hvis aktuelt)
  proofDocKey     String?   // ISO 9001: Dokumentert bevis
  isRequired      Boolean   // Obligatorisk kurs
  effectiveness   String?   // ISO 9001: Evaluering
  evaluatedBy     String?
  evaluatedAt     DateTime?
}
```

### Backend (Server Actions)
- ✅ `createTraining()` - Registrer opplæring
- ✅ `updateTraining()` - Oppdater opplæring
- ✅ `evaluateTraining()` - Evaluer effektivitet (ISO 9001: c)
- ✅ `deleteTraining()` - Slett opplæring (med sertifikat)
- ✅ `getTrainings()` - Hent all opplæring
- ✅ `getUserTrainings()` - Hent opplæring for bruker
- ✅ `getTrainingStats()` - Statistikk
- ✅ `getCompetenceMatrix()` - Kompetansematrise

### Frontend Komponenter
- ✅ **TrainingForm** - Registrer opplæring med sertifikat-opplasting
- 🚧 **TrainingList** - Liste over opplæring (under bygging)
- 🚧 **CompetenceMatrix** - Hvem har hvilken kompetanse
- 🚧 **TrainingEvaluationForm** - Evaluer effektivitet

### Pages
- 🚧 `/dashboard/training` - Oversikt med statistikk
- 🚧 `/dashboard/training/matrix` - Kompetansematrise
- 🚧 `/dashboard/training/[id]` - Detaljer om opplæring

---

## 📚 Standard HMS-kurs

Systemet har forhåndsdefinerte HMS-kurs:

### 1. HMS Introduksjon
- **Påkrevd:** Ja
- **Utløper:** Nei
- Grunnleggende HMS for alle ansatte

### 2. Arbeid i høyden
- **Påkrevd:** Nei
- **Utløper:** Etter 3 år
- Sikker bruk av stige, stillas, fallutstyr

### 3. Førstehjelp
- **Påkrevd:** Nei
- **Utløper:** Etter 2 år
- Grunnleggende førstehjelp og HLR

### 4. Brannsikkerhet
- **Påkrevd:** Ja
- **Utløper:** Etter 1 år
- Brannvern og slokkeutstyr

### 5. Kjemikaliehåndtering
- **Påkrevd:** Nei
- **Utløper:** Etter 3 år
- Sikker håndtering og lagring

### 6. Truckførerbevis
- **Påkrevd:** Nei
- **Utløper:** Etter 5 år
- Godkjent opplæring for truckkjøring

### 7. Varmt arbeid
- **Påkrevd:** Nei
- **Utløper:** Etter 3 år
- Sertifikat for sveising/skjæring

### 8. Arbeid i trange rom
- **Påkrevd:** Nei
- **Utløper:** Etter 3 år
- Sikkerhet ved arbeid i lukkede rom

---

## 🔄 Status

### NOT_STARTED (Ikke startet)
- Opplæring er planlagt men ikke gjennomført
- Farger: Grå

### COMPLETED (Fullført)
- Opplæring er gjennomført
- Ingen utløpsdato
- Farger: Grønn

### VALID (Gyldig)
- Opplæring er gjennomført og gyldig
- Utløper om mer enn 30 dager
- Farger: Grønn

### EXPIRING_SOON (Utløper snart)
- Utløper innen 30 dager
- Krever fornyelse
- Farger: Gul (sort tekst!)

### EXPIRED (Utløpt)
- Utløpsdato har passert
- Må fornyes
- Farger: Rød

---

## 📊 Kompetansematrise

Matrise som viser hvilke ansatte som har hvilken kompetanse:

```
┌──────────────┬─────────┬──────────┬───────────┬─────────┐
│ Ansatt       │ HMS     │ Førstehj │ Brannsikk │ Truck   │
├──────────────┼─────────┼──────────┼───────────┼─────────┤
│ Ola Nordmann │ ✅ Gyldig│ ⚠️ Snart  │ ✅ Gyldig │ -       │
│ Kari Hansen  │ ✅ Gyldig│ ❌ Utløpt │ ✅ Gyldig │ ✅ Gyldig│
│ Per Jensen   │ ⏳ Påbeg │ -         │ ✅ Gyldig │ -       │
└──────────────┴─────────┴──────────┴───────────┴─────────┘
```

Viser på et øyeblikk:
- Hvem som mangler påkrevd kompetanse
- Hvilke sertifikater som snart utløper
- Hvilke ansatte som kan utføre spesialisert arbeid

---

## 📋 Arbeidsflyt

```
1. REGISTRER OPPLÆRING
   ├─ Velg ansatt
   ├─ Velg kurs (standard eller egendefinert)
   ├─ Registrer gjennomføringsdato
   ├─ Last opp sertifikat (PDF/bilde)
   └─ Sett utløpsdato (hvis aktuelt)

2. DOKUMENTERT BEVIS
   ├─ Sertifikat lagres sikkert i R2/lokal storage
   ├─ Kobles til opplæringsregisteret
   └─ Kan lastes ned når som helst

3. PÅMINNELSER
   ├─ 30 dager før utløp: Varsling (gul badge)
   ├─ Etter utløp: Kritisk varsling (rød badge)
   └─ E-post varsler (fremtidig: BullMQ)

4. EVALUERING (ISO 9001: c)
   ├─ Leder evaluerer effektivitet
   ├─ "Har opplæringen gitt ønsket kompetanse?"
   ├─ Dokumenteres i systemet
   └─ Grunnlag for forbedring

5. KOMPETANSEMATRISE
   ├─ Oversikt over all kompetanse
   ├─ Identifiser kompetansegap
   ├─ Planlegg opplæring
   └─ Kontinuerlig forbedring
```

---

## 🎯 Eksempel

**Scenario: Ny ansatt skal ha førstehjelpskurs**

### 1. Registrering
```
Ansatt: Ola Nordmann
Kurs: Førstehjelp grunnkurs
Leverandør: Røde Kors
Gjennomført: 15.11.2025
Gyldig til: 15.11.2027 (2 år)
Sertifikat: ✅ Lastet opp (PDF)
Obligatorisk: Nei
```

### 2. Oppfølging
- **November 2026:** "1 år til fornying"
- **Oktober 2027:** 🟡 "Utløper snart - 30 dager igjen"
- **16. november 2027:** 🔴 "UTLØPT - Må fornyes"

### 3. Evaluering (etter 3 måneder)
```
Evaluert av: HMS-leder
Dato: 15.02.2026
Evaluering:
"Ola viser god forståelse for førstehjelp. Han har brukt kunnskapen
i praksis ved en mindre hendelse på arbeidsplassen. Opplæringen
vurderes som effektiv og har gitt ønsket kompetanse."
```

---

## 🔗 Integrasjoner

**Risikovurdering:**
- Koble manglende kompetanse til risikoer
- "Risiko: Fall fra høyde" → Krav: "Arbeid i høyden-kurs"

**Tiltak:**
- Opprett tiltak for å anskaffe kompetanse
- "Tiltak: Send 3 ansatte på truckførekurs innen Q2"

**Avvik:**
- Hvis hendelse skyldes manglende kompetanse
- Registrer som korrigerende tiltak

**Dashboard:**
- KPI: "95% har oppdatert brannsikkerhetsopplæring"
- KPI: "0 utløpte obligatoriske sertifikater"

---

## 📝 ISO 9001 Sjekkliste

| Krav | Status | Implementering |
|------|--------|----------------|
| a) Bestemme kompetanse | ✅ | Standard kurs + kompetansematrise |
| b) Sikre kompetanse | ✅ | Registrere med dokumentert bevis |
| c) Evaluere effektivitet | ✅ | Evalueringsmodul |
| d) Dokumentert informasjon | ✅ | Sertifikater + audit trail |
| Påminnelser | ✅ | Automatisk varsling ved utløp |
| Kompetansematrise | ✅ | Oversikt per ansatt |

---

**Status:** 🔵 Under implementering
**Prioritet:** ⭐⭐⭐⭐ (Høy - ISO 9001 compliance)
**Estimert ferdigstillelse:** 1-2 timer
**Sist oppdatert:** 31. oktober 2025

---

## 🚀 Neste steg

1. **TrainingList** - Liste med filtering og søk
2. **CompetenceMatrix** - Visuell matrise
3. **Pages** - Komplett UI for opplæring
4. **E-post varsler** - BullMQ job for påminnelser
5. **PDF-eksport** - Kompetansematrise som PDF
6. **Integrasjoner** - Koble til risikoer og tiltak

