/**
 * Lovpålagte kurs for servering og skjenking.
 * Alkoholloven § 1-7c, alkoholforskriften § 8-3, IK-mat § 5, 852/2004 art. 5, EU 1169/2011.
 */
export const HOSPITALITY_COURSE_KEYS = {
  foodSafety: "hospitality_food_safety_haccp",
  allergen: "hospitality_allergen",
  cleaning: "hospitality_cleaning",
  chemicals: "hospitality_chemicals",
  alcohol: "hospitality_alcohol_service",
} as const;

export const HOSPITALITY_REQUIRED_COURSES: Array<{
  courseKey: string;
  title: string;
  description: string;
  isRequired: boolean;
  validityYears: number | null;
  theme: "ik-mat" | "skjenking";
}> = [
  {
    courseKey: HOSPITALITY_COURSE_KEYS.foodSafety,
    title: "Mattrygghet og HACCP",
    description:
      "HACCP, temperaturkontroll og mattrygghet. Forordning (EF) 852/2004 art. 5 og IK-mat § 5.",
    isRequired: true,
    validityYears: 2,
    theme: "ik-mat",
  },
  {
    courseKey: HOSPITALITY_COURSE_KEYS.allergen,
    title: "Allergenbehandling for serveringspersonell",
    description: "EU-forordning 1169/2011 – de 14 allergener, merking og kommunikasjon til gjester.",
    isRequired: true,
    validityYears: 2,
    theme: "ik-mat",
  },
  {
    courseKey: HOSPITALITY_COURSE_KEYS.cleaning,
    title: "Renhold og hygiene i servering",
    description:
      "Dokumentert renhold av lokaler og utstyr. IK-mat § 5 nr. 3 og 6 og 852/2004 vedlegg II.",
    isRequired: true,
    validityYears: 2,
    theme: "ik-mat",
  },
  {
    courseKey: HOSPITALITY_COURSE_KEYS.chemicals,
    title: "Kjemikaliehåndtering – renhold og kjøkken",
    description: "Rengjøringsmidler, verneutstyr og sikkerhetsdatablad. AML § 4-5.",
    isRequired: true,
    validityYears: 3,
    theme: "ik-mat",
  },
  {
    courseKey: HOSPITALITY_COURSE_KEYS.alcohol,
    title: "Ansvarlig alkoholservering",
    description:
      "Alderskontroll, beruselse og bortvisning. Alkoholloven § 1-7c og alkoholforskriften § 8-3.",
    isRequired: true,
    validityYears: 2,
    theme: "skjenking",
  },
];

export function hospitalityCourseKeysForTheme(theme: string | null | undefined): string[] | null {
  if (theme === "skjenking") {
    return HOSPITALITY_REQUIRED_COURSES.filter((c) => c.theme === "skjenking").map((c) => c.courseKey);
  }
  if (theme === "ik-mat") {
    return HOSPITALITY_REQUIRED_COURSES.filter((c) => c.theme === "ik-mat").map((c) => c.courseKey);
  }
  return null;
}
