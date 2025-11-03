"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authAction } from "@/lib/server-action";
import { Role } from "@prisma/client";

const createUserSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  tenantId: z.string().cuid(),
  role: z.nativeEnum(Role),
});

export const createUser = authAction(
  createUserSchema,
  async (input, ctx) => {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error("Bruker med denne e-postadressen eksisterer allerede");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        tenants: {
          create: {
            tenantId: input.tenantId,
            role: input.role,
          },
        },
      },
      include: {
        tenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return user;
  }
);

const updateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  tenantId: z.string().cuid(),
  role: z.nativeEnum(Role),
});

export const updateUserRole = authAction(
  updateUserRoleSchema,
  async (input, ctx) => {
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
    });

    if (!userTenant) {
      throw new Error("Bruker ikke funnet i denne tenanten");
    }

    const updated = await prisma.userTenant.update({
      where: {
        id: userTenant.id,
      },
      data: {
        role: input.role,
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    return updated;
  }
);

