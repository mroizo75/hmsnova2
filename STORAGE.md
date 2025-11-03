# HMS Nova 2.0 - Fillagring

## Oversikt

HMS Nova støtter to lagringsmetoder for dokumenter og filer:

1. **Cloudflare R2** (Anbefalt for produksjon)
2. **Lokal fillagring** (For testing/utvikling)

## Anbefaling: Cloudflare R2

### Hvorfor R2?

✅ **Billig**
- $0.015 per GB/måned lagring
- **INGEN egress-kostnader** (gratis nedlasting)
- Estimat: 100 GB lagring = ~$1.50/mnd

✅ **Skalerbart**
- Ubegrenset kapasitet
- Automatisk CDN
- Global hastighet

✅ **Pålitelig**
- 99.9% uptime SLA
- Automatisk redundans
- Innebygd backup

✅ **VPS-vennlig**
- Tar ikke plass på VPS-disk
- Ingen backup-kompleksitet
- S3-kompatibel API

### Oppsett R2

1. **Opprett Cloudflare-konto**
   - Gå til [cloudflare.com](https://www.cloudflare.com/)
   - Registrer deg gratis

2. **Opprett R2 bucket**
   ```bash
   # I Cloudflare Dashboard:
   # 1. Gå til R2 Object Storage
   # 2. Create bucket: "hmsnova"
   # 3. Velg region: "Automatic" (global)
   ```

3. **Generer API-nøkler (VIKTIG: På ACCOUNT-nivå)**
   ```bash
   # I Cloudflare Dashboard:
   # 1. Klikk R2 i venstre meny (IKKE gå inn i bucketen)
   # 2. Øverst til høyre: Klikk "Manage R2 API Tokens"
   # 3. Create API token
   # 4. Navn: "HMS Nova"
   # 5. Permissions: "Object Read & Write" eller "Admin Read & Write"
   # 6. Klikk "Create API Token"
   # 7. KOPIER BEGGE (vises kun én gang):
   #    - Access Key ID
   #    - Secret Access Key
   ```

4. **Finn din Account ID**
   ```bash
   # Når du er på token-siden, se eksempel-endpoint:
   # https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   # 
   # Eller finn det i URL når du er inne på bucketen:
   # dashboard.cloudflare.com/<ACCOUNT_ID>/r2/...
   ```

5. **Legg til i `.env`**
   ```env
   STORAGE_TYPE=r2
   R2_ENDPOINT=https://ACCOUNT_ID_HER.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=din-access-key-fra-steg-3
   R2_SECRET_ACCESS_KEY=din-secret-key-fra-steg-3
   R2_BUCKET=hmsnova
   ```

   **VIKTIG:**
   - Bruk `https://<account-id>.r2.cloudflarestorage.com` format
   - IKKE bruk S3 API-linken fra bucket settings (det er for public access)
   - IKKE ha `/hmsnova` eller bucket-navn i endpoint
   - Bucket-navnet settes i `R2_BUCKET` variabelen

### Kostnadsestimat

| Bruk | Lagring | Kostnad/mnd |
|------|---------|-------------|
| Liten bedrift (10 GB) | 10 GB | $0.15 |
| Mellomstore (50 GB) | 50 GB | $0.75 |
| Stor (100 GB) | 100 GB | $1.50 |
| Meget stor (500 GB) | 500 GB | $7.50 |

*Ingen egress-kostnader = gratis nedlasting uansett trafikk!*

## Alternativ: AWS S3

Samme oppsett, men bruk:
```env
STORAGE_TYPE=r2
S3_ENDPOINT=https://s3.amazonaws.com
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=hmsnova
```

**Merk:** S3 har egress-kostnader (~$0.09/GB nedlasting)

## Lokal fillagring (Kun testing)

### Oppsett

```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage
```

### Fordeler
✅ Ingen ekstra kostnad
✅ Full kontroll
✅ Rask for lokal testing

### Ulemper
❌ Må backup manuelt
❌ Begrensning: VPS disk-kapasitet
❌ Ingen redundans
❌ Sakte ved store filer
❌ Komplisert ved flere servere

### Struktur

```
storage/
├── tenant-id-1/
│   ├── documents/
│   │   ├── 1234567890-abc123-hms-handbok.pdf
│   │   └── 1234567891-def456-sjekkliste.docx
│   ├── incidents/
│   │   └── 1234567892-ghi789-bilde.jpg
│   └── sds/
│       └── 1234567893-jkl012-sikkerhetsdatablad.pdf
└── tenant-id-2/
    └── ...
```

## Bytte mellom lagring

### Fra Lokal til R2

```bash
# 1. Sett opp R2-konfigur
# 2. Endre STORAGE_TYPE=r2 i .env
# 3. Migrer eksisterende filer:

# Bruk AWS CLI eller rclone
rclone sync ./storage/ r2:hmsnova/

# Eller manuelt via Cloudflare Dashboard
```

### Fra R2 til Lokal (ikke anbefalt)

```bash
# Last ned alle filer
rclone sync r2:hmsnova/ ./storage/

# Endre STORAGE_TYPE=local i .env
```

## API-bruk

Systemet abstraherer lagring, så koden fungerer likt:

```typescript
import { getStorage, generateFileKey } from "@/lib/storage";

// Last opp fil
const storage = getStorage(); // Velger automatisk basert på STORAGE_TYPE
const key = generateFileKey(tenantId, "documents", file.name);
await storage.upload(key, file);

// Hent nedlastingslenke
const url = await storage.getUrl(key, 3600); // 1 time

// Slett fil
await storage.delete(key);
```

## Sikkerhet

### R2
- ✅ Signerte URL-er (midlertidig tilgang)
- ✅ Utløper automatisk (standard 1 time)
- ✅ Ingen direkte public access

### Lokal
- ✅ Autentisering via NextAuth
- ✅ Path traversal-beskyttelse
- ✅ Tenant-isolering

## Backup

### R2
- Automatisk: R2 har innebygd redundans
- Ekstra: Aktiver versioning i bucket-settings
- Anbefalt: Ukentlig snapshot til annen storage

### Lokal
- **Kritisk**: Må sette opp egen backup!
- Anbefalt: Daglig rsync til backup-server
- Eksempel:
  ```bash
  # Cron job: Daglig backup kl 02:00
  0 2 * * * rsync -avz /path/to/storage/ backup-server:/backup/storage/
  ```

## Produksjonsoppsett (Anbefalt)

```env
# VPS: MySQL, Next.js app, Redis
DATABASE_URL=mysql://...
REDIS_URL=...

# R2: Alle filer
STORAGE_TYPE=r2
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=hmsnova
```

**Total kostnad estimat for liten bedrift:**
- VPS (2GB RAM): ~$10/mnd
- R2 (10 GB filer): ~$0.15/mnd
- **Totalt: ~$10.15/mnd**

## Spørsmål?

- Se `src/lib/storage.ts` for implementasjon
- Se `src/server/actions/document.actions.ts` for bruk
- Kontakt support for hjelp med oppsett

---

**Anbefaling:** Start med R2 fra dag 1. Det sparer deg for hodepine senere! 🚀

