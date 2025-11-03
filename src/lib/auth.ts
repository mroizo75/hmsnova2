import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
              take: 1,
            },
          },
        });

        if (!user || !user.password) {
          throw new Error("Ugyldig pålogging");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Ugyldig pålogging");
        }

        // SIKKERHET: Sjekk om tenant er suspendert pga ubetalt faktura
        if (!user.isSuperAdmin && !user.isSupport && user.tenants.length > 0) {
          const tenant = user.tenants[0].tenant;
          
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
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        
        // Hent brukerdata fra database for å få isSuperAdmin, isSupport, tenantId og role
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            tenants: {
              take: 1,
            },
          },
        });
        
        if (dbUser) {
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.isSupport = dbUser.isSupport || false;
          token.tenantId = dbUser.tenants[0]?.tenantId || null;
          token.role = dbUser.tenants[0]?.role || undefined;
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

