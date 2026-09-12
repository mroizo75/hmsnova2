import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { sanitizeAdapterAccount } from "@/lib/oauth-account";
import {
  AZURE_AD_OIDC_SCOPE,
  azureAdLoginMayIssueSession,
  canonicalizeAzureAdEmail,
  type AzureAdIdTokenProfile,
} from "@/lib/azure-ad-email";
import {
  ensureAzureAdUserTenant,
  getAzureAdJoinBlockReason,
  validateAzureAdLogin,
} from "@/lib/azure-ad-login";
import bcrypt from "bcryptjs";

const prismaAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
  ...prismaAdapter,
  createUser: (data) =>
    prismaAdapter.createUser!({
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : data.email,
      emailVerified: data.emailVerified ?? new Date(),
      image: null,
    }),
  linkAccount: (account) => prismaAdapter.linkAccount!(sanitizeAdapterAccount(account)),
};

const azureAdClientId = process.env.AZURE_AD_CLIENT_ID;
const azureAdClientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const isAzureAdConfigured = Boolean(azureAdClientId && azureAdClientSecret);

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    // Microsoft/Office 365 SSO.
    // Registreres kun når appen faktisk har credentials, slik at vi ikke sender
    // en tom client_id til Microsoft og får en uforståelig AADSTS-feil tilbake.
    ...(isAzureAdConfigured
      ? [
          AzureADProvider({
            clientId: azureAdClientId!,
            clientSecret: azureAdClientSecret!,
            tenantId: process.env.AZURE_AD_TENANT_ID || "common",
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                scope: AZURE_AD_OIDC_SCOPE,
                prompt: "select_account",
              },
            },
            profile(profile) {
              const azureProfile = profile as AzureAdIdTokenProfile;
              const email = canonicalizeAzureAdEmail(azureProfile);
              return {
                id: azureProfile.sub ?? email,
                name: azureProfile.name ?? email,
                email,
                image: null,
              };
            },
          }),
        ]
      : []),
    // Traditional credentials login
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Ugyldig pålogging");
        }

        // SIKKERHET: Normaliser e-post til lowercase for konsistent lookup
        const normalizedEmail = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            tenants: {
              include: {
                tenant: {
                  include: {
                    invoices: {
                      where: {
                        status: "OVERDUE",
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user) {
          throw new Error("Ugyldig pålogging");
        }

        if (!user.password) {
          throw new Error(
            !user.emailVerified
              ? "Kontoen er ikke aktivert. Sjekk e-posten for aktiveringlenke."
              : "Ugyldig pålogging"
          );
        }

        // SIKKERHET: Sjekk om kontoen er låst
        const MAX_ATTEMPTS = 5;
        const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutter

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Kontoen er midlertidig låst på grunn av for mange mislykkede påloggingsforsøk. Prøv igjen om ${minutesLeft} minutter.`
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // Inkrementer failed attempts (håndter null-verdier)
          const currentAttempts = user.failedLoginAttempts || 0;
          const newFailedAttempts = currentAttempts + 1;
          const shouldLock = newFailedAttempts >= MAX_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lastLoginAttempt: new Date(),
              ...(shouldLock && {
                lockedUntil: new Date(Date.now() + LOCKOUT_DURATION),
              }),
            },
          });

          if (shouldLock) {
            throw new Error(
              "For mange mislykkede påloggingsforsøk. Kontoen er låst i 15 minutter."
            );
          }

          const attemptsLeft = MAX_ATTEMPTS - newFailedAttempts;
          throw new Error(
            `Ugyldig pålogging. ${attemptsLeft} forsøk gjenstår før kontoen låses.`
          );
        }

        // SUCCESS: Reset failed attempts og lockout (håndter null-verdier)
        if ((user.failedLoginAttempts || 0) > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAttempt: new Date(),
            },
          });
        }

        if (!user.isSuperAdmin && !user.isSupport && user.tenants.length === 0) {
          const groupMembership = await prisma.corporateGroupUser.findFirst({
            where: { userId: user.id },
            select: { id: true },
          });
          if (!groupMembership) {
            throw new Error(
              "Kontoen er ikke koblet til en bedrift. Kontakt administrator eller support."
            );
          }
        }

        // SIKKERHET: Sjekk om tenant er suspendert pga ubetalt faktura
        if (!user.isSuperAdmin && !user.isSupport && user.tenants.length > 0) {
          const preferredTenant = user.lastTenantId
            ? user.tenants.find((membership) => membership.tenantId === user.lastTenantId)
            : null;
          const activeTenant =
            user.tenants.find(
              (membership) =>
                membership.tenant.status === "ACTIVE" || membership.tenant.status === "TRIAL",
            ) ?? null;
          const firstTenantMembership = user.tenants.at(0) ?? null;
          const tenant =
            preferredTenant?.tenant ?? activeTenant?.tenant ?? firstTenantMembership?.tenant ?? null;
          if (!tenant) {
            throw new Error("Kontoen mangler gyldig tenant-tilknytning.");
          }
          
          if (tenant.status === "SUSPENDED") {
            if (tenant.invoices.length > 0) {
              throw new Error(
                "Din konto er suspendert på grunn av ubetalt faktura. " +
                "Kontakt support@hmsnova.com eller betal fakturaen for å reaktivere kontoen."
              );
            } else {
              throw new Error(
                "Din konto er suspendert. Kontakt support@hmsnova.com for mer informasjon."
              );
            }
          }

          // Advarsel hvis faktura snart forfaller
          const pendingInvoices = await prisma.invoice.findMany({
            where: {
              tenantId: tenant.id,
              status: "PENDING",
              dueDate: {
                lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dager
              },
            },
          });

          if (pendingInvoices.length > 0) {
            // Logg inn, men vi viser varselet i dashboard
            console.warn(`Tenant ${tenant.id} har forfallende faktura`);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "azure-ad") {
        return true;
      }

      const email =
        canonicalizeAzureAdEmail(profile as AzureAdIdTokenProfile | undefined) ||
        canonicalizeAzureAdEmail(user.email);
      if (!email) {
        return false;
      }

      const validation = await validateAzureAdLogin(email);
      if (!validation.allowed || !validation.tenantId) {
        return false;
      }

      const blockReason = await getAzureAdJoinBlockReason(email, validation.tenantId);
      if (blockReason) {
        return false;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      delete (token as { picture?: unknown }).picture;

      const isAzureAdLogin = account?.provider === "azure-ad";

      if (user) {
        token.id = user.id;

        if (isAzureAdLogin) {
          if (!user.email) {
            throw new Error("AccessDenied");
          }
          const ensured = await ensureAzureAdUserTenant(user.id, user.email);
          if (!ensured.ok) {
            throw new Error("AccessDenied");
          }
          token.id = ensured.userId;
        }
        
        // Hent brukerdata fra database for å få isSuperAdmin, isSupport, tenantId og role
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: {
            tenants: {
              include: {
                tenant: {
                  select: {
                    name: true,
                    status: true,
                    isTavleOnly: true,
                  },
                },
              },
            },
          },
        });

        if (isAzureAdLogin && !dbUser) {
          throw new Error("AccessDenied");
        }
        
        if (dbUser) {
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.isSupport = dbUser.isSupport || false;
          token.hasMultipleTenants = dbUser.tenants.length > 1;
          token.preferredLocale = dbUser.preferredLocale || "nb";
          
          // Velg tenant deterministisk: lastTenantId om gyldig, ellers første aktive/trial, ellers første tilgjengelige.
          const eligibleTenants = dbUser.tenants.filter(
            (membership) =>
              membership.tenant.status === "ACTIVE" || membership.tenant.status === "TRIAL",
          );
          const selectedTenant =
            (dbUser.lastTenantId
              ? eligibleTenants.find((membership) => membership.tenantId === dbUser.lastTenantId)
              : null) ??
            eligibleTenants[0] ??
            dbUser.tenants.at(0) ??
            null;
          
          token.tenantId = selectedTenant?.tenantId || null;
          token.role = selectedTenant?.role || undefined;
          token.tenantName = selectedTenant?.tenant?.name || null;
          token.isTavleOnly = selectedTenant?.tenant?.isTavleOnly ?? false;
          // Lagre tidspunkt for siste kjente DB-oppdatering av rollen.
          // Brukes til versjonssjekkk – ingen polling nødvendig.
          token.roleUpdatedAt = selectedTenant?.updatedAt?.getTime() ?? null;

          const groupMembership = await prisma.corporateGroupUser.findFirst({
            where: { userId: dbUser.id },
            select: { groupId: true, role: true },
          });
          token.corporateGroupId = groupMembership?.groupId ?? null;
          token.corporateGroupRole = groupMembership?.role ?? null;

          if (
            isAzureAdLogin &&
            !azureAdLoginMayIssueSession({
              membershipCount: dbUser.tenants.length,
              tenantId: token.tenantId as string | null,
              isSuperAdmin: dbUser.isSuperAdmin,
              isSupport: dbUser.isSupport || false,
            })
          ) {
            throw new Error("AccessDenied");
          }
        }
      }
      
      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { lastTenantId: true },
        });

        const tenantCount = await prisma.userTenant.count({
          where: { userId: token.id as string },
        });
        token.hasMultipleTenants = tenantCount > 1;

        const groupMembership = await prisma.corporateGroupUser.findFirst({
          where: { userId: token.id as string },
          select: { groupId: true, role: true },
        });
        token.corporateGroupId = groupMembership?.groupId ?? null;
        token.corporateGroupRole = groupMembership?.role ?? null;

        const effectiveTenantId =
          currentUser?.lastTenantId && currentUser.lastTenantId !== token.tenantId
            ? currentUser.lastTenantId
            : (token.tenantId as string | null);

        if (effectiveTenantId && effectiveTenantId !== token.tenantId) {
          const newMembership = await prisma.userTenant.findUnique({
            where: {
              userId_tenantId: {
                userId: token.id as string,
                tenantId: effectiveTenantId,
              },
            },
            include: {
              tenant: {
                select: { name: true, status: true, isTavleOnly: true },
              },
            },
          });
          if (newMembership) {
            token.tenantId = effectiveTenantId;
            token.role = newMembership.role;
            token.tenantName = newMembership.tenant.name;
            token.isTavleOnly = newMembership.tenant.isTavleOnly ?? false;
            token.roleUpdatedAt = newMembership.updatedAt.getTime();
          }
        }

        if (token.tenantId) {
          const membership = await prisma.userTenant.findUnique({
            where: {
              userId_tenantId: {
                userId: token.id as string,
                tenantId: token.tenantId as string,
              },
            },
            select: { role: true, updatedAt: true },
          });
          if (membership) {
            const dbUpdatedAt = membership.updatedAt.getTime();
            const tokenUpdatedAt = token.roleUpdatedAt as number | null;
            if (tokenUpdatedAt === null || dbUpdatedAt > tokenUpdatedAt) {
              token.role = membership.role;
              token.roleUpdatedAt = dbUpdatedAt;
            }
          }

          try {
            const confidentialCount = await prisma.whistleblowAccessGrant.count({
              where: {
                tenantId: token.tenantId as string,
                granteeId: token.id as string,
                revokedAt: null,
                expiresAt: { gt: new Date() },
              },
            });
            token.hasConfidentialInbox = confidentialCount > 0;
          } catch {
            token.hasConfidentialInbox = false;
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.isSupport = token.isSupport as boolean;
        session.user.tenantId = token.tenantId as string | null;
        session.user.role = token.role as any;
        session.user.tenantName = token.tenantName as string | null;
        session.user.hasMultipleTenants = token.hasMultipleTenants as boolean;
        session.user.preferredLocale = (token.preferredLocale as string | undefined) ?? "nb";
        session.user.isTavleOnly = (token.isTavleOnly as boolean | undefined) ?? false;
        session.user.hasConfidentialInbox = (token.hasConfidentialInbox as boolean | undefined) ?? false;
        session.user.corporateGroupId = (token.corporateGroupId as string | null) ?? null;
        session.user.corporateGroupRole = (token.corporateGroupRole as any) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

