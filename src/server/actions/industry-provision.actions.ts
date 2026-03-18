"use server";

import { prisma } from "@/lib/db";
import { getIndustryPackage } from "@/lib/industry-packages";

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
    const assessmentTitle = `Landbruk risikovurdering ${currentYear}`;

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

      if (!tenant.simpleMenuItems) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            simpleMenuItems: [...packageConfig.simpleMenuHrefs],
          },
        });
      }
    });

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
