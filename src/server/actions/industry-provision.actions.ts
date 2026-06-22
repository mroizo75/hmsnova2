"use server";

import { prisma } from "@/lib/db";
import { getIndustryPackage } from "@/lib/industry-packages";
import { matchesIndustryScope } from "@/lib/industry-scope";
import { ensureGlobalRoutineTemplateLibrarySeeded } from "@/server/actions/routine-library.actions";

interface ProvisionIndustryPackageResult {
  success: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
}

function calculateRiskScore(likelihood: number, consequence: number): number {
  return likelihood * consequence;
}

export async function provisionIndustryPackage(
  tenantId: string
): Promise<ProvisionIndustryPackageResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        industry: true,
        simpleMenuItems: true,
      },
    });

    if (!tenant) {
      return {
        success: false,
        error: "Tenant ikke funnet",
      };
    }

    const packageConfig = getIndustryPackage(tenant.industry);
    if (!packageConfig) {
      return {
        success: true,
        skipped: true,
        message: "Ingen bransjepakke definert for tenant",
      };
    }

    const ownerCandidate = await prisma.userTenant.findFirst({
      where: {
        tenantId,
        role: { in: ["ADMIN", "HMS", "LEDER"] },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (!ownerCandidate) {
      return {
        success: false,
        error: "Fant ingen bruker å sette som ansvarlig for standard risikopunkter",
      };
    }

    const currentYear = new Date().getFullYear();
    const assessmentTitle = `${packageConfig.displayName} risikovurdering ${currentYear}`;

    await prisma.$transaction(async (tx) => {
      let assessment = await tx.riskAssessment.findFirst({
        where: {
          tenantId,
          title: assessmentTitle,
          assessmentYear: currentYear,
        },
        select: { id: true },
      });

      if (!assessment) {
        assessment = await tx.riskAssessment.create({
          data: {
            tenantId,
            title: assessmentTitle,
            assessmentYear: currentYear,
          },
          select: { id: true },
        });
      }

      for (const risk of packageConfig.risks) {
        const existingRisk = await tx.risk.findFirst({
          where: {
            tenantId,
            title: risk.title,
          },
          select: { id: true },
        });

        if (!existingRisk) {
          await tx.risk.create({
            data: {
              tenantId,
              riskAssessmentId: assessment.id,
              title: risk.title,
              context: risk.context,
              likelihood: risk.likelihood,
              consequence: risk.consequence,
              score: calculateRiskScore(risk.likelihood, risk.consequence),
              ownerId: ownerCandidate.userId,
              category: risk.category,
              description: risk.context,
              existingControls: risk.controls,
              riskStatement: risk.context,
            },
          });
        }
      }

      for (const template of packageConfig.sjaTemplates) {
        const existingTemplate = await tx.sjaTemplate.findFirst({
          where: {
            tenantId,
            name: template.name,
          },
          select: { id: true },
        });

        if (!existingTemplate) {
          await tx.sjaTemplate.create({
            data: {
              tenantId,
              name: template.name,
              description: template.description,
              workLocation: template.workLocation,
              createdById: ownerCandidate.userId,
              createdByName: "System",
              hazards: {
                create: template.hazards.map((hazard, index) => ({
                  sortOrder: index,
                  activity: hazard.activity,
                  hazard: hazard.hazard,
                  consequence: hazard.consequence,
                  probability: hazard.probability,
                  severity: hazard.severity,
                  measures: hazard.measures,
                })),
              },
            },
          });
        }
      }

      for (const inspectionTemplate of packageConfig.inspectionTemplates) {
        const existingInspectionTemplate = await tx.inspectionTemplate.findFirst({
          where: {
            tenantId,
            name: inspectionTemplate.name,
          },
          select: { id: true },
        });

        if (!existingInspectionTemplate) {
          await tx.inspectionTemplate.create({
            data: {
              tenantId,
              name: inspectionTemplate.name,
              description: inspectionTemplate.description,
              category: inspectionTemplate.category,
              riskCategory: inspectionTemplate.riskCategory,
              checklist: inspectionTemplate.checklist,
              isGlobal: false,
              industryScope: [packageConfig.industry],
            },
          });
        } else {
          await tx.inspectionTemplate.update({
            where: { id: existingInspectionTemplate.id },
            data: {
              industryScope: [packageConfig.industry],
            },
          });
        }
      }

      for (const course of packageConfig.courseTemplates) {
        const existingCourseTemplate = await tx.courseTemplate.findFirst({
          where: {
            tenantId,
            courseKey: course.courseKey,
          },
          select: { id: true },
        });

        if (!existingCourseTemplate) {
          await tx.courseTemplate.create({
            data: {
              tenantId,
              courseKey: course.courseKey,
              title: course.title,
              description: course.description,
              isRequired: course.isRequired,
              validityYears: course.validityYears,
              isGlobal: false,
              isActive: true,
            },
          });
        }
      }

      for (const legalReference of packageConfig.legalReferences) {
        const existingLegalReference = await tx.legalReference.findFirst({
          where: {
            title: legalReference.title,
            paragraphRef: legalReference.paragraphRef,
          },
          select: { id: true, industries: true },
        });

        if (!existingLegalReference) {
          await tx.legalReference.create({
            data: {
              title: legalReference.title,
              paragraphRef: legalReference.paragraphRef,
              description: legalReference.description,
              sourceUrl: legalReference.sourceUrl,
              industries: [packageConfig.industry],
              sortOrder: 100,
              lastVerifiedAt: new Date(),
            },
          });
        } else {
          const existingIndustries = Array.isArray(existingLegalReference.industries)
            ? (existingLegalReference.industries as string[])
            : [];
          const normalizedIndustries = existingIndustries.map((item) => item.toLowerCase());
          if (!normalizedIndustries.includes(packageConfig.industry)) {
            await tx.legalReference.update({
              where: { id: existingLegalReference.id },
              data: {
                industries: [...existingIndustries, packageConfig.industry],
                lastVerifiedAt: new Date(),
              },
            });
          }
        }
      }

      const existingSimpleMenuItems = Array.isArray(tenant.simpleMenuItems)
        ? (tenant.simpleMenuItems as string[])
        : [];
      const mergedSimpleMenuItems = [
        ...new Set([...existingSimpleMenuItems, ...packageConfig.simpleMenuHrefs]),
      ];

      if (mergedSimpleMenuItems.length > existingSimpleMenuItems.length) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            simpleMenuItems: mergedSimpleMenuItems,
          },
        });
      }
    });

    // Provisjoner rutinemaler som faktiske Routine-poster for tenanten
    await provisionRoutinesForTenant(tenantId, packageConfig.industry, ownerCandidate.userId);

    return {
      success: true,
      message: "Bransjepakke provisionert",
    };
  } catch (error: any) {
    console.error("Provision industry package error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke provisjonere bransjepakke",
    };
  }
}

/**
 * Kopierer relevante globale rutinemaler som faktiske Routine-poster for en tenant.
 * Idempotent: oppretter kun rutiner som ikke allerede finnes.
 * Inkluderer maler med industryScope "all" og maler som matcher tenant-bransjen.
 */
async function provisionRoutinesForTenant(
  tenantId: string,
  industry: string,
  createdByUserId: string
): Promise<void> {
  await ensureGlobalRoutineTemplateLibrarySeeded();

  const globalTemplates = await prisma.routineTemplate.findMany({
    where: { isGlobal: true, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      content: true,
      legalReference: true,
      industryScope: true,
    },
  });

  const matchingTemplates = globalTemplates.filter((tpl) =>
    matchesIndustryScope(tpl.industryScope, industry)
  );

  for (const template of matchingTemplates) {
    const exists = await prisma.routine.findFirst({
      where: {
        tenantId,
        templateId: template.id,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.routine.create({
        data: {
          tenantId,
          templateId: template.id,
          title: template.title,
          description: template.description,
          category: template.category,
          content: template.content as any,
          legalReference: template.legalReference,
          createdBy: createdByUserId,
          status: "ACTIVE",
          reviewIntervalMonths: 12,
        },
      });
    }
  }
}
