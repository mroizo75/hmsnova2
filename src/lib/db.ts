import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton
 * Prevents multiple instances in development hot reload
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();
export const prisma = db; // Alias for backwards compatibility

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
