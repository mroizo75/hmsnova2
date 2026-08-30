import { prisma } from "@/lib/db";
import { getIndustryPackage } from "@/lib/industry-packages";
import { HOSPITALITY_REQUIRED_COURSES } from "@/lib/hospitality-courses";

/** Sikrer at tenant har lovpålagte hospitality-kurs (IK-mat og skjenking). */
export async function ensureHospitalityCourses(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { industry: true },
  });
  if (getIndustryPackage(tenant?.industry)?.industry !== "hospitality") {
    return;
  }

  for (const course of HOSPITALITY_REQUIRED_COURSES) {
    const existing = await prisma.courseTemplate.findFirst({
      where: { tenantId, courseKey: course.courseKey },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.courseTemplate.create({
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
