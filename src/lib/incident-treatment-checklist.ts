/**
 * Fast behandlingssjekkliste for alle avvik (ISO 9001 kap. 10.2).
 * Nøklene speiler seed-incident-subcategories.ts.
 */

export type TreatmentChecklistItem = {
  key: string;
  label: string;
};

export const TREATMENT_CHECKLIST_COLUMNS: TreatmentChecklistItem[][] = [
  [
    { key: "REKLAMASJON", label: "Reklamasjon" },
    { key: "GARANTI", label: "Garanti" },
    { key: "VAREMOTTAK", label: "Varemottak" },
    { key: "SKADE_KUNDENS_EIENDELER", label: "Skade/tap kundens eiendeler" },
    { key: "INTERN_AVVIK", label: "Interne avvik" },
  ],
  [
    { key: "EX_ENHETSSERTIFISERING", label: "Ex-enhetssertifisering" },
    { key: "EX_TYPESERTIFISERING", label: "Ex-typesertifisering" },
    { key: "TILBAKEKALLING_IKKE_EX", label: "Tilbakekalling (ikke Ex)" },
    { key: "TILBAKEKALLING_EX_ENHET", label: "Tilbakekalling Ex-enhet" },
    { key: "TILBAKEKALLING_EX_TYPE", label: "Tilbakekalling Ex-type" },
    { key: "SERTIFISERINGSORGAN_VARSLET", label: "Eksternt sertifiseringsorgan er varslet" },
  ],
];

export const TREATMENT_CHECKLIST_KEYS = TREATMENT_CHECKLIST_COLUMNS.flat().map(
  (item) => item.key,
);

export const TREATMENT_OTHER_KEY = "ANNET";
