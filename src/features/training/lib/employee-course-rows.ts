export interface EmployeeCourseDraft {
  courseKey: string;
  title: string;
  provider: string;
  validUntil?: string;
  file?: unknown;
}

export function isBlankEmployeeCourseRow(row: EmployeeCourseDraft): boolean {
  return (
    !row.courseKey.trim() &&
    !row.title.trim() &&
    !row.provider.trim() &&
    !row.validUntil?.trim() &&
    !row.file
  );
}

export function employeeCourseRowIssue(row: EmployeeCourseDraft): string | null {
  if (isBlankEmployeeCourseRow(row)) return null;
  if (row.title.trim().length < 3) return "Kurstittel må ha minst 3 tegn";
  if (row.provider.trim().length < 2) return "Leverandør må ha minst 2 tegn";
  return null;
}

export function employeeCourseStepIssues(rows: EmployeeCourseDraft[]): string[] {
  const active = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isBlankEmployeeCourseRow(row));

  if (active.length === 0) {
    return ["Legg til minst ett kurs med tittel og leverandør"];
  }

  return active.flatMap(({ row, index }) => {
    const issue = employeeCourseRowIssue(row);
    return issue ? [`Kurs ${index + 1}: ${issue}`] : [];
  });
}

export function courseKeyForEmployeeRow(row: EmployeeCourseDraft, index: number): string {
  if (row.courseKey.trim() && row.courseKey !== "custom") {
    return row.courseKey.trim();
  }

  const slug = row.title
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return slug ? `custom-${slug}` : `custom-${index + 1}`;
}
