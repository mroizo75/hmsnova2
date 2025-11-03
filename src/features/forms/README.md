# 📋 Digital Forms Module

> **STATUS:** 🚧 Under planlegging - implementeres senere
> 
> Se `FORMS.md` i rot-mappen for full dokumentasjon og implementasjonsplan.

## Oversikt

Denne modulen lar admin lage egne digitale skjemaer som brukere fyller ut med signatur.

**Eksempler:**
- HMS Morgenmøte (daglig)
- Ukentlig HMS-inspeksjon
- Avviksrapport
- Risikovurdering

## Konkurransefordel

De fleste HMS-systemer (SafetySync, Isafety, Easyweb) mangler dette!  
De må laste opp papirskjemaer eller bruke eksterne verktøy som Google Forms.

## Mappestruktur

```
src/features/forms/
├── components/
│   ├── form-builder/      # Admin: Skjemabygger (drag-drop)
│   └── form-filler/       # Bruker: Skjemautfylling
├── schemas/               # Zod validation schemas
├── utils/                 # Hjelpefunksjoner (PDF, RRULE, etc.)
└── README.md             # Denne filen
```

## Neste steg

1. **Database:** ✅ Modeller lagt til i `prisma/schema.prisma`
2. **Backend:** Lag server actions (`form-template.actions.ts`, `form-submission.actions.ts`)
3. **Form Builder:** Admin-grensesnitt for å bygge skjemaer
4. **Form Filler:** Bruker-grensesnitt for å fylle ut skjemaer
5. **Signatur:** Digital signatur med timestamp + userId
6. **PDF Export:** Generer PDF med signatur og svar

## Ressurser

- **Form Builder Library:** React Hook Form + Zod
- **Drag-and-Drop:** @dnd-kit/core (eller react-beautiful-dnd)
- **Signatur:** react-signature-canvas
- **RRULE:** rrule npm package
- **PDF:** Playwright/Puppeteer (allerede planlagt i prosjekt.md)

---

**Kontakt Kenneth for spørsmål eller for å starte implementering.**

