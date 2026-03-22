# Sprakstotte i HMS Nova

HMS Nova bruker `next-intl` med sentral konfig i `src/i18n/routing.ts` og `src/i18n/request.ts`.

## Legg til nytt sprak

1. Legg til sprakkode i `locales` i `src/i18n/routing.ts`.
2. Opprett ny fil: `src/i18n/messages/<sprakkode>.json`.
3. Oversett kun nøkler som trengs.

Manglende nøkler fallbacker automatisk til `nb` via merge i `src/i18n/request.ts`.

## Viktig

- `defaultLocale` er `nb`.
- `localePrefix` er satt til `never` (samme URL, språk styres av locale-cookie).
- Sprakvalg blir dermed skalerbart: nye språk krever bare oppdatert locale-liste + ny språkfil.
