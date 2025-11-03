# 📋 Tiltak (Measures) - ISO 9001 Compliant

Komplett løsning for håndtering av risikoreduserende tiltak i henhold til ISO 9001.

## ✅ Implementert

### ISO 9001 Compliance
✅ **Planlegging av tiltak:**
- Alle tiltak må ha ansvarlig person (`responsibleId`)
- Alle tiltak må ha tidsplan/frist (`dueAt`)
- Tiltak må dokumenteres (`description`)
- Tiltak må knyttes til årsak (risiko, avvik, revisjon, mål)

✅ **Oppfølging:**
- Status tracking (PENDING, IN_PROGRESS, DONE, OVERDUE)
- Automatisk varsling ved forfalte tiltak
- Fullføringsdato (`completedAt`)
- Evalueringsnotat ved fullføring

✅ **Dokumentasjon og sporbarhet:**
- Audit logging på alle operasjoner
- Historikk over alle endringer
- Linking til risikoer/avvik/revisjoner

### Backend (Server Actions)
- ✅ `getMeasures()` - Hent alle tiltak for tenant
- ✅ `getMeasuresByRisk()` - Hent tiltak for spesifikk risiko
- ✅ `createMeasure()` - Opprett nytt tiltak
- ✅ `updateMeasure()` - Oppdater eksisterende tiltak
- ✅ `completeMeasure()` - Fullfør tiltak med evaluering
- ✅ `deleteMeasure()` - Slett tiltak
- ✅ `getMeasureStats()` - Statistikk (pending/pågående/fullført/forfalt)

### Frontend Komponenter
- ✅ **MeasureForm** - Modal dialog for opprettelse av tiltak
- ✅ **MeasureList** - Tabell med alle tiltak
- ✅ Integrasjon i `/dashboard/risks/[id]` (tiltak per risiko)
- ✅ `/dashboard/actions` - Oversikt over alle tiltak

### Validation & Utils
- ✅ Zod schemas for validering
- ✅ `isMeasureOverdue()` - Sjekk om tiltak er forfalt
- ✅ `getMeasureStatusLabel()` - Norske statuslabels
- ✅ `getMeasureStatusColor()` - Fargekodet status

## 📊 Statuser

### PENDING (Ikke startet)
- Tiltaket er planlagt men ikke påbegynt
- Farger: Grå
- Vises som "Ikke startet"

### IN_PROGRESS (Pågår)
- Tiltaket er under gjennomføring
- Farger: Blå
- Vises som "Pågår"

### DONE (Fullført)
- Tiltaket er fullført
- Farger: Grønn
- Vises som "Fullført"
- Krever `completedAt` timestamp

### OVERDUE (Forfalt)
- Frist har passert og tiltak ikke fullført
- Farger: Rød
- Krever oppfølging
- Automatisk detektert basert på `dueAt`

## 🔗 Integrasjoner

### Risikovurdering
```typescript
// Når et tiltak opprettes for en risiko:
- Risikostatus endres automatisk til "MITIGATING"
- Når alle tiltak er fullført → Risikostatus endres til "CLOSED"
```

### Audit Log
```typescript
// All aktivitet logges:
- MEASURE_CREATED
- MEASURE_UPDATED
- MEASURE_COMPLETED
- MEASURE_DELETED
```

## 📋 ISO 9001 Sjekkliste

✅ **4.4 Kvalitetsstyringssystem og prosesser:**
- Tiltak dokumenteres og følges opp
- Ansvar og myndighet er definert

✅ **6.1 Handlinger for å håndtere risikoer og muligheter:**
- Planlagte tiltak for identifiserte risikoer
- Evaluering av tiltak

✅ **9.1 Overvåking, måling, analyse og evaluering:**
- Oppfølging av tiltak med frister
- Statistikk og KPIer

✅ **10.2 Avvik og korrigerende tiltak:**
- Systematisk håndtering av tiltak
- Dokumentasjon av hva som ble gjort

## 🎯 Eksempel på bruk

```typescript
// 1. Opprett tiltak for høyrisiko situasjon
createMeasure({
  riskId: "clx123",
  title: "Installere gelender på tak",
  description: "Montere permanent gelender på tak i produksjonshall",
  responsibleId: "user123", // HMS-leder
  dueAt: new Date("2025-12-15"),
});

// 2. Start arbeidet
updateMeasure({
  id: "measure123",
  status: "IN_PROGRESS",
});

// 3. Fullfør og evaluer
completeMeasure({
  id: "measure123",
  completedAt: new Date(),
  completionNote: "Gelender installert. Inspisert og godkjent av BHT.",
});
// → Risikostatus endres automatisk til CLOSED hvis alle tiltak er fullført
```

## 🚀 Neste steg (fremtidige forbedringer)

1. **E-post varslinger:**
   - Varsle ansvarlig person når tiltak opprettes
   - Påminnelse 7 dager før frist
   - Varsel når tiltak er forfalt

2. **Tiltak-maler:**
   - Ferdiglagde maler for vanlige tiltak
   - "Fallsikring", "Kjemikaliehåndtering", etc.

3. **Ressurskobling:**
   - Koble kostnader til tiltak
   - Koble dokumenter til tiltak

4. **Gantt-diagram:**
   - Visuell tidslinje for tiltak
   - Se avhengigheter mellom tiltak

---

**Status:** ✅ Fullstendig implementert med ISO 9001 compliance
**Sist oppdatert:** 31. oktober 2025

