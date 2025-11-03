# HMS Nova 2.0 - Dokumentmodul

## ✅ Fullført implementasjon

Dokumentmodulen er nå komplett med alle funksjoner:

### 1. Fillagring (Fleksibel)
- ✅ **R2/S3-kompatibel storage** (Anbefalt)
- ✅ **Lokal fillagring** (Backup)
- ✅ Abstraksjon: Bytt enkelt mellom lagring
- ✅ Signerte URL-er for sikker tilgang

### 2. CRUD-operasjoner
- ✅ Opprett dokument med filopplasting
- ✅ Liste alle dokumenter
- ✅ Last ned dokument
- ✅ Oppdater dokumentinformasjon
- ✅ Godkjenn dokumenter
- ✅ Slett dokumenter (beskyttet mot sletting av lovdokumenter)

### 3. Dokumenttyper
- ✅ **LAW** - Lovdokumenter (kan ikke slettes)
- ✅ **PROCEDURE** - Prosedyrer
- ✅ **CHECKLIST** - Sjekklister
- ✅ **FORM** - Skjemaer
- ✅ **SDS** - Sikkerhetsdatablad
- ✅ **PLAN** - Planer
- ✅ **OTHER** - Annet

### 4. Statuser
- ✅ **DRAFT** - Utkast
- ✅ **APPROVED** - Godkjent
- ✅ **ARCHIVED** - Arkivert

### 5. Versjonshåndtering
- ✅ Versjonsnummer (v1.0, v1.1, etc.)
- ✅ Sporbar historikk
- ✅ Godkjenningsdato og hvem

### 6. UI-komponenter
- ✅ Dokumentliste med søk/filter
- ✅ Opplastingsskjema
- ✅ Statistikk-kort (totalt, utkast, godkjent, arkivert)
- ✅ Handlinger: Last ned, Rediger, Slett

## Bruk

### Opprett nytt dokument

1. Gå til `/dashboard/documents`
2. Klikk "Nytt dokument"
3. Fyll inn:
   - Tittel
   - Type dokument
   - Versjon (default: v1.0)
   - Last opp fil (PDF, Word, Excel, TXT)
4. Klikk "Last opp dokument"

### Last ned dokument

1. Finn dokumentet i listen
2. Klikk nedlastingsikon
3. Filen åpnes i ny fane/lastes ned

### Godkjenn dokument

```typescript
import { approveDocument } from "@/server/actions/document.actions";

const result = await approveDocument({
  id: "document-id",
  approvedBy: "user-id",
});
```

### Arkiver dokument

```typescript
import { updateDocument } from "@/server/actions/document.actions";

const result = await updateDocument({
  id: "document-id",
  status: "ARCHIVED",
});
```

## Filstruktur

```
src/
├── lib/
│   └── storage.ts              # Storage abstraction (R2/S3/Lokal)
├── features/documents/
│   ├── schemas/
│   │   └── document.schema.ts  # Zod validering
│   └── components/
│       ├── document-list.tsx   # Dokumentliste
│       └── document-form.tsx   # Opplastingsskjema
├── server/actions/
│   └── document.actions.ts     # Server actions (CRUD)
└── app/
    ├── (dashboard)/dashboard/documents/
    │   ├── page.tsx            # Hovedside
    │   └── new/
    │       └── page.tsx        # Ny dokument-side
    └── api/files/[...path]/
        └── route.ts            # Serve filer (kun for lokal lagring)
```

## Konfigurasjon

### Velg lagringsmetode

I `.env`:

```env
# For R2 (Anbefalt)
STORAGE_TYPE=r2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET=hmsnova

# Eller for lokal lagring (Testing)
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage
```

Se `STORAGE.md` for full guide.

## Sikkerhet

### Filsikkerhet
- ✅ Autentisering påkrevd for alle operasjoner
- ✅ Tenant-isolering (brukere ser kun sine dokumenter)
- ✅ Signerte URL-er med utløpstid (1 time)
- ✅ Path traversal-beskyttelse
- ✅ Lovdokumenter kan ikke slettes

### Validering
- ✅ Zod-validering på alle input
- ✅ Filtype-sjekk
- ✅ Maksimal filstørrelse (konfigurerbart)

## API Reference

### Server Actions

#### `getDocuments(tenantId: string)`
Hent alle dokumenter for en tenant.

```typescript
const result = await getDocuments("tenant-id");
if (result.success) {
  console.log(result.data); // Array<Document>
}
```

#### `createDocument(formData: FormData)`
Opprett nytt dokument med fil.

```typescript
const formData = new FormData();
formData.append("tenantId", "tenant-id");
formData.append("title", "HMS-håndbok");
formData.append("kind", "PROCEDURE");
formData.append("version", "v1.0");
formData.append("file", file);

const result = await createDocument(formData);
```

#### `updateDocument(input)`
Oppdater dokumentinformasjon.

```typescript
const result = await updateDocument({
  id: "doc-id",
  title: "Ny tittel",
  status: "APPROVED",
});
```

#### `approveDocument(input)`
Godkjenn dokument.

```typescript
const result = await approveDocument({
  id: "doc-id",
  approvedBy: "user-id",
});
```

#### `deleteDocument(id: string)`
Slett dokument (og fil).

```typescript
const result = await deleteDocument("doc-id");
```

#### `getDocumentDownloadUrl(id: string)`
Hent midlertidig nedlastingslenke.

```typescript
const result = await getDocumentDownloadUrl("doc-id");
if (result.success) {
  window.open(result.data.url, "_blank");
}
```

## Database

### Document-modell

```prisma
model Document {
  id         String       @id @default(cuid())
  tenantId   String
  kind       DocumentKind
  title      String
  slug       String
  version    String
  status     DocStatus    @default(DRAFT)
  fileKey    String       // R2/S3 key eller lokal path
  approvedBy String?
  approvedAt DateTime?
  updatedBy  String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
}
```

## Fremtidige forbedringer

- [ ] Versionshistorikk (lagre gamle versjoner)
- [ ] Bulk-opplasting (flere filer samtidig)
- [ ] PDF-forhåndsvisning i browser
- [ ] Elektronisk signatur (e-sign)
- [ ] Dokumentmaler
- [ ] Automatisk PDF-generering fra HTML
- [ ] OCR for søk i dokumenter
- [ ] Tags og kategorier
- [ ] Avansert søk og filter

## Testing

For å teste dokumentmodulen:

```bash
# 1. Konfigurer storage (se .env.example)
# 2. Start server
npm run dev

# 3. Gå til
http://localhost:3000/dashboard/documents

# 4. Test opplasting
# - Klikk "Nytt dokument"
# - Fyll inn skjema
# - Last opp en PDF/Word-fil
# - Se dokumentet i listen
# - Test nedlasting
```

## Support

For spørsmål om dokumentmodulen:
- Se `src/features/documents/` for kode
- Se `STORAGE.md` for lagringsoppsett
- Se `src/server/actions/document.actions.ts` for API

---

**Status:** ✅ Produksjonsklar
**Sist oppdatert:** 31. oktober 2025

