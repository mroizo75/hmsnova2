# Rapportmaler (Adobe Document Generation)

Lag layouten i **Microsoft Word**. Fyll feltene med **Adobe Document Generation Tagger**.
Ikke bruk Adobe Acrobat Sign-skjemafeltmaler — de er for signatur, ikke rapportdata.

## Produksjonsmal

Alle branded HMS-rapporter (avvik, RUH, tilsyn, psykososial rapport AML § 4-3, årsplan, inspeksjon, m.m.) bruker **`HMS_Nova_Mal.docx`**.

| Fil | Rolle |
|---|---|
| `HMS_Nova_Mal.docx` | **Produksjonsmal** for alle rapporter |
| `hms-nova-report.docx` | Eldre generert mal (ikke i bruk) |
| `wellbeing-report.docx` | Eldre generert mal (ikke i bruk) |
| `sample-merge-data.json` | Lastes opp i Taggeren så feltene treffer HMS Nova |

## Slik redigerer du malen

1. Åpne Word. **Sett inn → Hent tillegg →** søk etter **Adobe Document Generation**.
2. Åpne `HMS_Nova_Mal.docx` og design header, farger, tabeller og forside.
3. I Taggeren: last opp `sample-merge-data.json` → **Generate Tags**.
4. Sett markøren der dataen skal stå og sett inn taggen (f.eks. `{{tenantName}}`).
5. Logo: sett inn et bilde, rediger **alternativ tekst** til JSON med `"location-path": "tenantLogo"`.
6. Lagre `.docx` i denne mappen. Neste PDF bruker den nye malen.

Adobe Document Generation er **case-sensitive**. Malen bruker både `{{reportLabel}}` og `{{REPORTLABEL}}` — begge fylles fra samme felt.

Kjør `npm run templates:reports` bare hvis du vil regenerere de eldre generated-malene. Scriptet **overskriver ikke** `HMS_Nova_Mal.docx`.
