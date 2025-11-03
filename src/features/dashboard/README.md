# Dashboard Module

Komplett oversiktsside for HMS Nova 2.0 med sanntidsstatistikk og aktivitetsfeed.

## 📋 Funksjoner

### 📊 Nøkkelstatistikk (KPI Cards)
- **Dokumenter**: Totalt + antall godkjente
- **Høyrisiko**: Antall risikoer med score ≥15
- **Åpne hendelser**: Hendelser som ikke er lukket
- **Forfalte tiltak**: Tiltak med forfalt frist
- **Åpne revisjonsfunn**: Funn som ikke er verifisert
- **Utgåtte kurs**: Opplæringer som har utløpt
- **Aktive mål**: Mål i aktiv status

### 🔴 Fargeindikering
- ✅ **Grønn**: Alt OK
- ⚠️ **Gul**: Oppmerksomhet kreves
- 🔴 **Rød**: Handling kreves umiddelbart

### 📰 Aktivitetsfeed
- Viser siste 10 hendelser fra alle moduler
- Sortert etter tidspunkt (nyeste først)
- Inkluderer:
  - Dokumenter
  - Risikoer
  - Hendelser
  - Tiltak
  - Revisjoner
  - Opplæring
  - Mål
- Klikkbare lenker til hver aktivitet
- Badge med type og status
- Tidsstempel med "for X tid siden"

### 📅 Kommende frister
- Viser neste 10 frister innen 30 dager
- Sortert etter frist (nærmest først)
- Inkluderer:
  - Tiltak
  - Revisjoner
  - Opplæring (utløpsdato)
  - Mål (deadline)
- Fargekodet urgency:
  - 🔴 **Rød**: Forfalt eller i dag
  - 🟠 **Orange**: 1-3 dager
  - 🟡 **Gul**: 4-7 dager
  - ⚪ **Grå**: 8+ dager
- Klikkbare lenker
- Varsling om forsinkelser

### ⚡ Hurtighandlinger
- Opprett nye elementer raskt fra dashboard
- 7 quick actions:
  1. Nytt dokument
  2. Ny risikovurdering
  3. Ny hendelse
  4. Nytt tiltak
  5. Ny revisjon
  6. Ny opplæring
  7. Nytt mål

## 🎨 UI-komponenter

### `/features/dashboard/components/`

#### **`stats-card.tsx`**
Gjenbrukbar statistikk-kort med:
- Tittel
- Verdi (tall/tekst)
- Beskrivelse
- Ikon
- Fargevarianter (default, success, warning, danger)
- Trend (valgfritt)

```tsx
<StatsCard
  title="Dokumenter"
  value={42}
  description="12 godkjente"
  icon={FileText}
  variant="success"
  trend={{ value: 15, isPositive: true }}
/>
```

#### **`activity-feed.tsx`**
Aktivitetsfeed med:
- ScrollArea for mange elementer
- Badge for type og status
- Klikkbare lenker
- Tidsstempel med date-fns
- Ikoner per aktivitetstype

```tsx
<ActivityFeed activities={[
  {
    id: "1",
    type: "document",
    title: "Ny prosedyre",
    timestamp: new Date(),
    link: "/dashboard/documents/1",
    status: "DRAFT"
  }
]} />
```

#### **`upcoming-deadlines.tsx`**
Fristliste med:
- ScrollArea for mange frister
- Fargekodet urgency
- Badge for type
- Klikkbare lenker
- Formatert dato med date-fns
- Varsling om forsinkelser

```tsx
<UpcomingDeadlines deadlines={[
  {
    id: "1",
    title: "Fullføre tiltak",
    dueDate: new Date(),
    type: "action",
    link: "/dashboard/actions/1",
    isOverdue: false
  }
]} />
```

#### **`quick-actions.tsx`**
Quick action grid med:
- 7 forhåndsdefinerte handlinger
- Ikoner og beskrivelser
- Grid layout (2 kolonner)
- Linker til "new"-sider

## 🔧 Databehandling

### Statistikkberegning
```typescript
// Høyrisiko (score ≥ 15)
const highRisks = risks.filter((r) => r.riskScore && r.riskScore >= 15);

// Åpne hendelser
const openIncidents = incidents.filter((i) => i.status !== "CLOSED");

// Forfalte tiltak
const overdueMeasures = measures.filter(
  (m) => m.status !== "DONE" && new Date(m.dueAt) < now
);

// Åpne revisjonsfunn
const openFindings = audits.reduce(
  (sum, a) => sum + a.findings.filter((f) => f.status !== "VERIFIED").length,
  0
);
```

### Aktivitetsaggregering
```typescript
// Kombiner alle aktiviteter fra alle moduler
const activities = [
  ...documents.map((d) => ({ ... })),
  ...risks.map((r) => ({ ... })),
  // ... etc
]
  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  .slice(0, 10); // Siste 10
```

### Fristberegning
```typescript
// Neste 30 dager
const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

const deadlines = [
  ...measures.filter((m) => new Date(m.dueAt) <= thirtyDaysFromNow),
  // ... etc
]
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  .slice(0, 10); // Nærmeste 10
```

## 📦 Dependencies

### Nye pakker
- ✅ **date-fns**: Datoformatering og beregninger
  ```bash
  npm install date-fns
  ```

### shadcn/ui komponenter
- ✅ **scroll-area**: Scrollbare områder
  ```bash
  npx shadcn@latest add scroll-area
  ```

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Login med admin
admin@test.no / admin123

# Gå til: /dashboard

# Du skal nå se:
1. 7 statistikk-kort med ekte data
2. Aktivitetsfeed med siste hendelser
3. Kommende frister med farger
4. 7 hurtighandlinger
```

## 🎯 Sanntidsdata

Dashboard henter data fra:
- ✅ `Document` - Dokumenter
- ✅ `Risk` - Risikoer
- ✅ `Incident` - Hendelser
- ✅ `Measure` - Tiltak
- ✅ `Audit` + `AuditFinding` - Revisjoner + funn
- ✅ `Training` - Opplæring
- ✅ `Goal` - Mål

All data hentes parallelt med `Promise.all()` for optimal ytelse.

## 🚀 Ytelse

- **Server-side rendering**: All data hentes på server
- **Parallell data-henting**: `Promise.all()` for alle queries
- **Optimert filtering**: Kun nødvendige felt inkluderes
- **Begrenset visning**: Max 10 aktiviteter/frister
- **ScrollArea**: Effektiv håndtering av lange lister

## 📊 ISO 9001 Compliance

Dashboard gir oversikt over:
- ✅ **5.1 Ledelsens engasjement**: Oversikt over hele systemet
- ✅ **6.2 Kvalitetsmål**: Status på alle mål
- ✅ **9.1 Overvåking og måling**: KPIer og statistikk
- ✅ **9.3 Ledelsens gjennomgang**: Datagrunnlag for beslutninger
- ✅ **10.2 Avvik og korrigerende tiltak**: Oversikt over åpne avvik

## 🎨 UX Features

- ✅ Fargekodet status (grønn/gul/rød)
- ✅ Ikoner for hver aktivitetstype
- ✅ Klikkbare lenker til detaljer
- ✅ Tidsstempel med "for X tid siden"
- ✅ Formaterte datoer på norsk
- ✅ Responsive grid layout
- ✅ ScrollArea for lange lister
- ✅ Quick actions for rask tilgang
- ✅ Badge-system for kategorisering

## 📝 TODO
- [ ] Grafer med Chart.js eller Recharts
- [ ] Filtrerbar aktivitetsfeed
- [ ] Eksporter dashboard som PDF
- [ ] Personalisering (velg widgets)
- [ ] Real-time oppdatering med WebSocket
- [ ] Push-varsler for kritiske hendelser
- [ ] Dashboard for ulike roller (admin/leder/ansatt)
- [ ] Trend-analyse over tid

## ✨ Komplett!

Dashboard-modulen er **100% ferdig** og produksjonsklar! 🎉

