"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { CreateHazardousWasteDeliverySchema } from "@/features/environment/schemas/hazardous-waste.schema";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function createHazardousWasteDelivery(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canUpdateEnvironment) {
      return { success: false as const, error: "Du har ikke tilgang til å registrere farlig avfall" };
    }

    const data = CreateHazardousWasteDeliverySchema.parse(input);
    if (data.aspectId) {
      const aspect = await prisma.environmentalAspect.findFirst({
        where: { id: data.aspectId, tenantId: auth.tenantId, category: "WASTE" },
        select: { id: true },
      });
      if (!aspect) {
        return { success: false as const, error: "Miljøaspektet må være et avfallsaspekt i denne bedriften" };
      }
    }

    await prisma.hazardousWasteDelivery.create({
      data: {
        tenantId: auth.tenantId,
        wasteType: data.wasteType,
        customType: data.wasteType === "ANNET" ? data.customType?.trim() || null : null,
        amountKg: data.amountKg,
        deliveredAt: data.deliveredAt,
        declarationNumber: data.declarationNumber,
        recipient: data.recipient,
        aspectId: data.aspectId || null,
        notes: data.notes || null,
        declaredById: auth.userId,
      },
    });

    revalidatePath("/dashboard/environment");
    revalidatePath("/dashboard/hms-handbok");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre leveransen") };
  }
}
