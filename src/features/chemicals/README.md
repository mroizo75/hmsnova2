# Stoffkartotek (Chemical Management Module)

Komplett løsning for HMS-styring av kjemikalier med sikkerhetsdatablad, faresymboler og PPE-krav.

## 📋 Funksjoner

### 🧪 Kjemikalieadministrasjon
- **Produktregistrering**: Navn, leverandør, CAS-nummer
- **Lagringsinformasjon**: Lokasjon og mengde
- **Status**: I bruk, Utfases, Arkivert

### ⚠️ Faresymboler (GHS/CLP)
- **9 GHS-piktogrammer** med visuell velger:
  - Brannfarlig
  - Etsende
  - Eksplosivt
  - Gass under trykk
  - Giftig
  - Helserisiko
  - Kronisk helsefarlig
  - Miljøfare
  - Oksiderende

### 🦺 Personlig verneutstyr (PPE)
- **ISO 7010 standardikoner**
- Visuell velger med 18+ vanlige PPE-krav:
  - Vernebriller
  - Hjelm
  - Hørselsvern
  - Åndedrettsvern
  - Vernehansker
  - Fotvernogmange flere

### 📄 Sikkerhetsdatablad (SDS)
- **PDF-opplasting**: Last opp sikkerhetsdatablad
- **Versjonshåndtering**: Spor versjoner og datoer
- **Revisjonsplan**: Automatisk påminnelse om årlig gjennomgang
- **Nedlasting**: Enkel tilgang til databladet

### 🔍 Revisjonskontroll
- **Årlig gjennomgang**: Påminnelse om revisjonsfrister
- **Verifisering**: Marker som verifisert ved internrevisjon
- **Forfalt varsling**: Tydelig markering av forfalte datablad

## 🎨 UI-komponenter

### `/features/chemicals/components/`

#### **`chemical-list.tsx`**
- Tabell med alle kjemikalier
- Søk (produkt, leverandør, CAS)
- Filtrering på status
- Nedlasting av SDS
- Verifiseringsknapp
- Status-badges med farger

#### **`chemical-form.tsx`**
- Komplett registreringsskjema
- Integrerte velgere for:
  - Faresymboler
  - PPE-krav
- PDF-opplasting for SDS
- Automatisk beregning av neste revisjonsdato

#### **`hazard-pictogram-selector.tsx`**
- Visuell velger for GHS-faresymboler
- Grid-layout med 3x3 (mobil) eller 5x3 (desktop)
- Klikk for å velge/fjerne
- Visuell indikator på valgte (checkmark)
- JSON-lagring

#### **`ppe-selector.tsx`**
- Visuell velger for ISO 7010 PPE-ikoner
- Scrollbar for mange ikoner (18+)
- Grid-layout 4x5 eller 6x3
- Hover-titler med navn
- JSON-lagring

## 🗂️ Data Model

```prisma
model Chemical {
  id               String          @id @default(cuid())
  tenantId         String
  productName      String          // Produktnavn
  supplier         String?         // Leverandør
  casNumber        String?         // CAS-nummer
  hazardClass      String?         // Fareklasse (GHS/CLP)
  hazardStatements String?         // H-setninger
  warningPictograms String?        // JSON array av faresymboler (filnavn)
  requiredPPE      String?         // JSON array av påkrevd PPE (ISO 7010)
  sdsKey           String?         // Sikkerhetsdatablad (PDF) i storage
  sdsVersion       String?         // Versjon av sikkerhetsdatablad
  sdsDate          DateTime?       // Dato for sikkerhetsdatablad
  nextReviewDate   DateTime?       // Neste revisjonsdata for datablad
  location         String?         // Lagringssted
  quantity         Float?          // Mengde
  unit             String?         // Enhet (liter, kg, etc)
  status           ChemicalStatus  @default(ACTIVE)
  notes            String?         // Notater/kommentarer
  lastVerifiedAt   DateTime?       // Sist verifisert i revisjon
  lastVerifiedBy   String?         // Hvem verifiserte sist
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}

enum ChemicalStatus {
  ACTIVE      // I bruk
  PHASED_OUT  // Utfases
  ARCHIVED    // Ikke lenger i bruk
}
```

## 🔧 Server Actions

### `/server/actions/chemical.actions.ts`

```typescript
// CRUD
getChemicals(tenantId)
getChemical(chemicalId)
createChemical(input, sdsFile?)
updateChemical(chemicalId, input, sdsFile?)
deleteChemical(chemicalId)

// SDS
downloadSDS(chemicalId)

// Revisjon
verifyChemical(chemicalId)

// Statistikk
getChemicalStats(tenantId)
```

## 📊 Statistikk

Dashboard viser:
- **Totalt**: Antall registrerte kjemikalier
- **I bruk**: Aktive produkter
- **Mangler datablad**: Kjemikalier uten SDS
- **Trenger revisjon**: Innen 30 dager
- **Forfalt revisjon**: Må handles umiddelbart

## 🎯 HMS-krav

### Arbeidstilsynet
✅ Alle farlige kjemikalier skal være registrert  
✅ Oppdaterte sikkerhetsdatablad må være tilgjengelige  
✅ Ansatte skal ha tilgang til relevant informasjon  
✅ Opplæring i sikker håndtering må dokumenteres

### ISO 9001
✅ 7.1.4 Miljø for prosessene: Kontroll på kjemikalier  
✅ 7.5 Dokumentert informasjon: SDS må være tilgjengelig  
✅ 9.1 Overvåking og måling: Revisjoner av stoffkartotek

### Internkontrollforskriften
✅ § 5: Kartlegging av farer og problemer  
✅ § 6: Analyse av risiko  
✅ § 7: Tiltak for å redusere risiko

## 📁 Fil struktur

```
/public
  /faremerker          # 9 GHS-piktogrammer (.webp)
  /ppe                 # 62 ISO 7010 PPE-ikoner (.png)

/src/features/chemicals
  /components
    - chemical-list.tsx
    - chemical-form.tsx
    - hazard-pictogram-selector.tsx
    - ppe-selector.tsx
  - README.md

/src/app/(dashboard)/dashboard/chemicals
  - page.tsx           # Hovedside
  /new
    - page.tsx         # Registrer ny
  /[id]
    - page.tsx         # Detaljer
    /edit
      - page.tsx       # Rediger

/src/server/actions
  - chemical.actions.ts
```

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Login med admin
admin@test.no / admin123

# Naviger til: /dashboard/chemicals

# Test funksjoner:
1. Registrer nytt kjemikalie
2. Velg faresymboler visuelt
3. Velg PPE-krav visuelt
4. Last opp sikkerhetsdatablad (PDF)
5. Se forfallsvarsler
6. Verifiser i revisjon
```

## 🎨 Visuelle features

### Faresymbol-velger
- Grid med 9 piktogrammer
- Hover-effekt med scale
- Visuell indikator (checkmark) på valgte
- Border-farge endres ved valg
- JSON-lagring

### PPE-velger
- Scrollbar med 18+ ikoner
- Kompakt grid 4x5 eller 6x3
- Titler ved hover
- Blå border og bakgrunn ved valg
- JSON-lagring

### Detaljside
- Faresymboler vises som bilder (20x20px)
- PPE-krav vises som bilder (16x16px)
- Fargekodet status
- Forfalt-varsel
- Verifiseringsstatus

## ✨ Komplett!

Stoffkartotek-modulen er **100% ferdig** og produksjonsklar! 🧪

Modulen oppfyller alle HMS-krav og gir en moderne, visuell opplevelse for kjemikaliehåndtering med:
- ✅ Visuell velger for faresymboler
- ✅ Visuell velger for PPE-krav
- ✅ SDS-håndtering med PDF
- ✅ Automatisk revisjonskontroll
- ✅ Forfallsvarsler
- ✅ Audit logging

