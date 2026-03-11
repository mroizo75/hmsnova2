/**
 * Server actions for form management
 */

"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Kopierer et globalt skjema til tenant som en egendefinert kopi
 */
export async function copyGlobalFormTemplate(formId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return { success: false, error: "Ikke autentisert" };
    }

    // Hent det globale skjemaet med alle felt
    const globalForm = await prisma.formTemplate.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!globalForm) {
      return { success: false, error: "Skjema ikke funnet" };
    }

    if (!globalForm.isGlobal) {
      return { success: false, error: "Kan kun kopiere globale skjemaer" };
    }

    // Sjekk om tenanten allerede har en kopi
    const existingCopy = await prisma.formTemplate.findFirst({
      where: {
        tenantId: session.user.tenantId,
        title: {
          startsWith: globalForm.title,
        },
        category: globalForm.category,
      },
    });

    // Generer unikt navn hvis kopi allerede eksisterer
    let copyTitle = `${globalForm.title} (Kopi)`;
    if (existingCopy) {
      const copyCount = await prisma.formTemplate.count({
        where: {
          tenantId: session.user.tenantId,
          title: {
            contains: globalForm.title,
          },
        },
      });
      copyTitle = `${globalForm.title} (Kopi ${copyCount + 1})`;
    }

    // Opprett kopi med alle felt
    const copiedForm = await prisma.formTemplate.create({
      data: {
        tenantId: session.user.tenantId,
        title: copyTitle,
        description: globalForm.description,
        numberPrefix: globalForm.numberPrefix,
        category: globalForm.category,
        isActive: true,
        isGlobal: false, // Ikke global lenger
        requiresSignature: globalForm.requiresSignature,
        requiresApproval: globalForm.requiresApproval,
        isRecurring: globalForm.isRecurring,
        recurrenceRule: globalForm.recurrenceRule,
        accessType: globalForm.accessType,
        allowedRoles: globalForm.allowedRoles,
        allowedUsers: globalForm.allowedUsers,
        createdBy: session.user.id,
        fields: {
          create: globalForm.fields.map((field) => ({
            fieldType: field.fieldType,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            isRequired: field.isRequired,
            order: field.order,
            options: field.options,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    return { success: true, data: copiedForm };
  } catch (error: any) {
    console.error("Feil ved kopiering av skjema:", error);
    return { success: false, error: error.message || "Kunne ikke kopiere skjema" };
  }
}

/**
 * Sletter et skjema (kun tenant-spesifikke)
 */
export async function deleteFormTemplate(formId: string, force = false) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return { success: false, error: "Ikke autentisert" };
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id: formId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      return { success: false, error: "Skjema ikke funnet" };
    }

    if (form.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ingen tilgang til dette skjemaet" };
    }

    if (form.isGlobal) {
      return { success: false, error: "Kan ikke slette globale skjemaer" };
    }

    if (form._count.submissions > 0 && !force) {
      return {
        success: false,
        error: `Dette skjemaet har ${form._count.submissions} utfyllinger som også vil bli slettet.`,
        requiresConfirmation: true,
        submissionCount: form._count.submissions,
      };
    }

    await prisma.formTemplate.delete({
      where: { id: formId },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Feil ved sletting av skjema:", error);
    return { success: false, error: error.message || "Kunne ikke slette skjema" };
  }
}

/**
 * Deaktiverer et skjema (setter isActive = false)
 */
export async function toggleFormTemplateActive(formId: string, isActive: boolean) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return { success: false, error: "Ikke autentisert" };
    }

    // Hent skjemaet
    const form = await prisma.formTemplate.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return { success: false, error: "Skjema ikke funnet" };
    }

    // Sjekk eierskap
    if (form.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ingen tilgang til dette skjemaet" };
    }

    // Hindre deaktivering av globale skjemaer
    if (form.isGlobal) {
      return { success: false, error: "Kan ikke endre status på globale skjemaer" };
    }

    // Oppdater status
    await prisma.formTemplate.update({
      where: { id: formId },
      data: { isActive },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Feil ved endring av skjema-status:", error);
    return { success: false, error: error.message || "Kunne ikke endre status" };
  }
}
