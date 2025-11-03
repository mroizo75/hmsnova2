# 🛡️ Risikovurdering - 5x5 Matrise

Komplett løsning for HMS risikovurdering med interaktiv 5x5 matrise.

## ✅ Implementert

### Backend
- ✅ **Server Actions** (`risk.actions.ts`)
  - `getRisks()` - Hent alle risikoer for tenant
  - `getRisk(id)` - Hent spesifikk risiko med tiltak
  - `createRisk()` - Opprett ny risikovurdering
  - `updateRisk()` - Oppdater eksisterende risiko
  - `deleteRisk()` - Slett risiko
  - `getRiskStats()` - Statistikk (kritisk/høy/medium/lav)

### Frontend Komponenter
- ✅ **RiskMatrix** - Interaktiv 5x5 matrise med fargekodet risikonivå
- ✅ **RiskForm** - Skjema for opprettelse/redigering med live beregning
- ✅ **RiskList** - Tabell med alle risikoer, sortert etter score

### Pages
- ✅ `/dashboard/risks` - Oversikt med statistikk og matrise
- ✅ `/dashboard/risks/new` - Opprett ny risikovurdering
- ✅ `/dashboard/risks/[id]` - Rediger eksisterende risiko

### Validation & Utils
- ✅ Zod schemas for validering
- ✅ `calculateRiskScore()` - Beregn score og nivå
- ✅ `getMatrixCellColor()` - Fargekodet celler
- ✅ Audit logging for alle operasjoner

## 🎨 5x5 Risikomatrise

### Sannsynlighet (Likelihood) 1-5
1. **Svært usannsynlig** - Nesten aldri (<1%)
2. **Usannsynlig** - Skjer sjelden (1-10%)
3. **Mulig** - Kan hende (10-25%)
4. **Sannsynlig** - Kan skje (25-50%)
5. **Svært sannsynlig** - Skjer ofte (>50%)

### Konsekvens (Consequence) 1-5
1. **Ubetydelig** - Ingen skade
2. **Mindre** - Førstehjelpsskade
3. **Moderat** - Fraværsskade
4. **Alvorlig** - Varig skade
5. **Katastrofal** - Dødsfall

### Risikonivå (Score)
- **1-5:** 🟢 Lav (Kan aksepteres)
- **6-11:** 🟡 Moderat (Planlegg tiltak)
- **12-19:** 🟠 Høy (Krever tiltak snarest)
- **20-25:** 🔴 Kritisk (Må håndteres umiddelbart)

## 📊 Eksempel på bruk

```typescript
// Opprett risiko: Fall fra høyde
createRisk({
  title: "Fall fra høyde ved takarbeid",
  context: "Arbeid på tak uten fallsikring",
  likelihood: 4,  // Sannsynlig
  consequence: 5, // Katastrofal
  // Score: 4 × 5 = 20 (KRITISK)
});
```

## 🔗 Integrasjoner

- **Tiltak (Measures):** Knytt tiltak direkte til risikoer
- **Audit Log:** Full sporbarhet av alle endringer
- **Dashboard:** Statistikk og KPIer
- **Toast Notifications:** Brukerv

ennlig feedback

## 🎯 Neste steg

1. **PDF-eksport:** Generer risikovurderingsrapport
2. **Risikoregister:** Samlet oversikt for ledelsen
3. **Gjentakende vurderinger:** Automatisk påminnelse om revisjon
4. **Residual risk:** Vurder risiko ETTER tiltak
5. **Risikohistorikk:** Spor endringer over tid

---

**Status:** ✅ Fullstendig implementert
**Sist oppdatert:** 31. oktober 2025

