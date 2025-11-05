import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton
 * Build-safe initialization
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// Only initialize if DATABASE_URL is available
let prismaInstance: PrismaClient | undefined;

try {
  if (process.env.DATABASE_URL) {
    prismaInstance = globalForPrisma.prisma || new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaInstance;
    }
  } else {
    console.warn('DATABASE_URL not set - database will not be available');
  }
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  prismaInstance = undefined;
}

export const db = prismaInstance as PrismaClient;
export const prisma = db; // Alias for backwards compatibility
