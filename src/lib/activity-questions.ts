export type ActivityQuestion = {
  key: string;
  text: string;
  category: string;
  defaultForNace: string[] | null;
  drivesActivities: string[];
};

export const ACTIVITY_QUESTIONS: readonly ActivityQuestion[] = [
  {
    key: "has_employees",
    text: "Har virksomheten ansatte?",
    category: "generelt",
    defaultForNace: null,
    drivesActivities: ["employees"],
  },
  {
    key: "has_machinery",
    text: "Benytter dere maskiner eller arbeidsutstyr?",
    category: "arbeidsutstyr",
    defaultForNace: ["41", "42", "43", "10", "16", "25", "28"],
    drivesActivities: ["machinery"],
  },
  {
    key: "has_certified_equipment",
    text: "Benytter dere truck, kran eller annet arbeidsutstyr som krever dokumentert eller sertifisert sikkerhetsopplæring?",
    category: "arbeidsutstyr",
    defaultForNace: ["41", "42", "43", "49", "52"],
    drivesActivities: ["certified_equipment", "machinery"],
  },
  {
    key: "work_at_height",
    text: "Utfører ansatte arbeid i høyden?",
    category: "arbeidsutstyr",
    defaultForNace: ["41", "42", "43"],
    drivesActivities: ["height_work", "fall_protection"],
  },
  {
    key: "has_chemicals",
    text: "Benytter eller oppbevarer dere kjemikalier?",
    category: "kjemikalier",
    defaultForNace: ["20", "24", "46.75", "81.2"],
    drivesActivities: ["chemicals", "chemical_register"],
  },
  {
    key: "has_construction",
    text: "Utfører dere bygge- eller anleggsarbeid?",
    category: "bygg_anlegg",
    defaultForNace: ["41", "42", "43"],
    drivesActivities: ["construction"],
  },
  {
    key: "works_on_construction_sites",
    text: "Arbeider dere på bygge- eller anleggsplasser?",
    category: "bygg_anlegg",
    defaultForNace: ["41", "42", "43"],
    drivesActivities: ["construction_site"],
  },
  {
    key: "has_hot_work",
    text: "Utfører dere varmt arbeid?",
    category: "bygg_anlegg",
    defaultForNace: ["25", "33", "43.2"],
    drivesActivities: ["hot_work"],
  },
  {
    key: "has_electrical_work",
    text: "Utfører dere elektriske arbeider?",
    category: "elektro",
    defaultForNace: ["43.21"],
    drivesActivities: ["electrical_work"],
  },
  {
    key: "has_food_handling",
    text: "Håndterer eller produserer dere mat?",
    category: "mat_servering",
    defaultForNace: ["10", "56", "55.1"],
    drivesActivities: ["food_handling", "haccp"],
  },
  {
    key: "has_transport",
    text: "Har dere kjøretøy eller transportvirksomhet?",
    category: "transport",
    defaultForNace: ["49", "52", "53"],
    drivesActivities: ["transport"],
  },
  {
    key: "has_lone_work",
    text: "Utfører ansatte arbeid alene?",
    category: "arbeidstid",
    defaultForNace: null,
    drivesActivities: ["lone_work"],
  },
  {
    key: "has_night_shift",
    text: "Arbeider ansatte natt eller skift?",
    category: "arbeidstid",
    defaultForNace: ["55.1", "86", "87"],
    drivesActivities: ["night_shift"],
  },
  {
    key: "has_violence_risk",
    text: "Har virksomheten særlig risiko for vold eller trusler?",
    category: "psykososialt",
    defaultForNace: ["86", "87", "88", "84.24"],
    drivesActivities: ["violence_risk"],
  },
  {
    key: "has_noise_exposure",
    text: "Har ansatte eksponering for støy?",
    category: "eksponering",
    defaultForNace: ["41", "42", "43", "25", "16"],
    drivesActivities: ["noise_exposure"],
  },
  {
    key: "has_hazardous_substances",
    text: "Har ansatte eksponering for støv, asbest, kvarts eller andre helsefarlige stoffer?",
    category: "eksponering",
    defaultForNace: ["41", "42", "43", "08", "23"],
    drivesActivities: ["hazardous_substances"],
  },
  {
    key: "has_biological_risk",
    text: "Har dere biologiske risikofaktorer?",
    category: "eksponering",
    defaultForNace: ["86", "87", "38"],
    drivesActivities: ["biological_risk"],
  },
  {
    key: "has_ergonomic_risk",
    text: "Har dere arbeid som kan medføre ergonomisk belastning?",
    category: "ergonomi",
    defaultForNace: null,
    drivesActivities: ["ergonomic_risk"],
  },
  {
    key: "has_temporary_workers",
    text: "Bruker dere innleid arbeidskraft?",
    category: "arbeidskraft",
    defaultForNace: null,
    drivesActivities: ["temporary_workers"],
  },
  {
    key: "has_foreign_workers",
    text: "Benytter dere utenlandske arbeidstakere?",
    category: "arbeidskraft",
    defaultForNace: null,
    drivesActivities: ["foreign_workers"],
  },
  {
    key: "has_explosive_areas",
    text: "Har virksomheten eksplosjonsfarlige områder eller stoffer?",
    category: "brann_eksplosjon",
    defaultForNace: ["06", "19", "20"],
    drivesActivities: ["explosive_areas"],
  },
  {
    key: "has_flammable_goods",
    text: "Har dere brannfarlige varer?",
    category: "brann_eksplosjon",
    defaultForNace: ["47.3", "19"],
    drivesActivities: ["flammable_goods", "fire_hazard"],
  },
  {
    key: "has_privacy_processing",
    text: "Har dere personvernrelatert behandling som krever egne rutiner?",
    category: "personvern",
    defaultForNace: null,
    drivesActivities: ["privacy_processing"],
  },
  {
    key: "has_waste_emissions",
    text: "Har virksomheten avfall eller utslipp som kan være regulert?",
    category: "miljo",
    defaultForNace: ["38", "20", "24"],
    drivesActivities: ["waste_emissions"],
  },
] as const;

export const ACTIVITY_CATEGORIES: Record<string, string> = {
  generelt: "Generelt",
  arbeidsutstyr: "Maskiner og arbeidsutstyr",
  kjemikalier: "Kjemikalier og stoffer",
  bygg_anlegg: "Bygg og anlegg",
  elektro: "Elektro",
  mat_servering: "Mat og servering",
  transport: "Transport",
  arbeidstid: "Arbeidstid og alenearbeid",
  psykososialt: "Psykososialt arbeidsmiljø",
  eksponering: "Eksponering og helse",
  ergonomi: "Ergonomi",
  arbeidskraft: "Arbeidskraft",
  brann_eksplosjon: "Brann og eksplosjon",
  personvern: "Personvern",
  miljo: "Miljø og avfall",
};

export function deriveActiveActivities(
  answers: Record<string, boolean>,
  _naceCode?: string | null,
): string[] {
  const activities = new Set<string>();

  for (const q of ACTIVITY_QUESTIONS) {
    if (answers[q.key]) {
      for (const activity of q.drivesActivities) {
        activities.add(activity);
      }
    }
  }

  return Array.from(activities).sort();
}

export function getDefaultAnswers(
  naceCode: string | null,
): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};

  for (const q of ACTIVITY_QUESTIONS) {
    if (q.defaultForNace && naceCode) {
      defaults[q.key] = q.defaultForNace.some((prefix) =>
        naceCode.startsWith(prefix),
      );
    } else {
      defaults[q.key] = false;
    }
  }

  return defaults;
}
