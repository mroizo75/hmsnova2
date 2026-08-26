"use client";

import { useQuery } from "@tanstack/react-query";
import { CourseTemplatesManager } from "@/features/training/components/course-templates-manager";
import { fetchTrainingCourses } from "@/server/queries/training.queries";

type CoursesData = Awaited<ReturnType<typeof fetchTrainingCourses>>;

interface CoursesContentProps {
  initialData: CoursesData;
  tenantId: string;
}

export function CoursesContent({ initialData, tenantId }: CoursesContentProps) {
  const { data } = useQuery({
    queryKey: ["training", "courses"],
    queryFn: () => fetchTrainingCourses(),
    initialData,
  });

  return (
    <CourseTemplatesManager
      tenantId={tenantId}
      globalCourses={data.globalCourses}
      tenantCourses={data.tenantCourses}
    />
  );
}
