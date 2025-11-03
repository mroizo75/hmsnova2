# Settings Module

Komplett innstillingsmodul for HMS Nova 2.0 med full RBAC-støtte.

## 📋 Funksjoner

### 🏢 Bedriftsinnstillinger (Company)
- Bedriftsinformasjon (navn, org.nummer, kontaktinfo)
- Adresse og poststed
- **Kun for administratorer**

### 👤 Brukerinnstillinger (Profile)
- Rediger navn og e-post
- Endre passord (med validering av nåværende passord)
- Passordkrav: Minimum 8 tegn

### 👥 Brukeradministrasjon (Users)
- **Kun for administratorer**
- Liste over alle brukere i bedriften
- Inviter nye brukere (sender automatisk midlertidig passord)
- Endre brukerroller: ANSATT, LEDER, ADMIN
- Fjerne brukere fra bedriften
- Sikkerhet: Kan ikke endre egen rolle eller fjerne seg selv

### 💳 Abonnement og fakturaer (Subscription)
- Abonnementsinformasjon (plan, status, pris)
- Periodeinfo (start/slutt)
- Prøveperiode-varsel hvis aktiv
- Fakturahistorikk (siste 10)
- Fakturastatus: Betalt, Sendt, Forfalt, Utkast

## 🎨 UI-komponenter

### `/features/settings/components/`

- **`tenant-settings-form.tsx`** - Bedriftsinnstillinger med RBAC
- **`user-profile-form.tsx`** - Profil + passord
- **`user-management.tsx`** - Brukeradministrasjon med invite/edit/remove
- **`subscription-info.tsx`** - Abonnement og fakturaer (read-only)

## 🔧 Server Actions

### `/server/actions/settings.actions.ts`

#### Tenant Settings
```typescript
updateTenantSettings(data: { name, orgNumber, contactEmail, ... })
```

#### User Settings
```typescript
updateUserProfile(data: { name, email })
updateUserPassword(data: { currentPassword, newPassword })
```

#### User Management
```typescript
getTenantUsers()
inviteUser(data: { email, name, role })
updateUserRole(userId: string, role: string)
removeUserFromTenant(userId: string)
```

#### Subscription
```typescript
getSubscriptionInfo()
```

## 🔐 Sikkerhet

### RBAC (Role-Based Access Control)
- **ADMIN**: Full tilgang til alle innstillinger
- **LEDER**: Kun profil og abonnementsinformasjon
- **ANSATT**: Kun profil

### Sikkerhetstiltak
- ✅ Passord-hashing med bcrypt
- ✅ E-post-duplikatsjekk
- ✅ Validering av nåværende passord før endring
- ✅ Kan ikke endre egen rolle (admin)
- ✅ Kan ikke fjerne seg selv
- ✅ Audit logging av alle endringer

## 📊 Data Model

### Tenant
```prisma
model Tenant {
  id            String    @id @default(cuid())
  name          String
  orgNumber     String?
  contactEmail  String?
  contactPhone  String?
  address       String?
  city          String?
  postalCode    String?
  status        TenantStatus
  trialEndsAt   DateTime?
  subscription  Subscription?
  invoices      Invoice[]
  users         UserTenant[]
}
```

### User
```prisma
model User {
  id          String       @id @default(cuid())
  email       String       @unique
  name        String?
  password    String
  tenants     UserTenant[]
}
```

### UserTenant (Join Table)
```prisma
model UserTenant {
  userId    String
  tenantId  String
  role      Role     // ADMIN, LEDER, ANSATT
  user      User
  tenant    Tenant
  
  @@unique([userId, tenantId])
}
```

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Login med admin
admin@test.no / admin123

# Naviger til: /dashboard/settings

# Test alle tabs:
1. Bedrift - Endre bedriftsinformasjon
2. Profil - Endre navn/e-post/passord
3. Brukere - Inviter, endre rolle, fjerne
4. Abonnement - Se abonnement og fakturaer
```

## 📝 TODO
- [ ] E-post-integrasjon for invitasjoner (Resend)
- [ ] Fakturagenering med Fiken API
- [ ] Eksporter fakturaer som PDF
- [ ] Betalingsintegrasjon (Stripe/Vipps)
- [ ] To-faktor autentisering
- [ ] Sessjonshåndtering og logout på andre enheter

## 🎯 ISO 9001 Compliance
- ✅ 5.3 Roller og ansvar: Tydelig rollehierarki
- ✅ 7.2 Kompetanse: Brukerprofiler dokumentert
- ✅ 7.5 Dokumentert informasjon: Audit logging

