import type { PdfReportConfig } from "@/lib/pdf-brand";

/**
 * Beredskapsliste til lederens perm.
 * AML § 3-1: arbeidsgiver skal ha planer for ulykker og andre faresituasjoner.
 * AML § 5-2: alvorlig personskade og dødsfall varsles straks til politi og Arbeidstilsynet.
 * Internkontrollforskriften § 5 nr. 6: planer og tiltak skal dokumenteres.
 * GDPR art. 5: bare det som trengs for å nå den ansatte og pårørende. Ingen diagnose.
 */
export type EmergencyRosterKin = {
  name: string;
  relation: string | null;
  phone: string | null;
};

export type EmergencyRosterEmployee = {
  name: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  nextOfKin: EmergencyRosterKin[];
};

export function formatNextOfKin(kin: EmergencyRosterKin[]): string {
  if (kin.length === 0) return "Ikke registrert";
  return kin
    .map((person) => [person.name, person.relation, person.phone].filter(Boolean).join(", "))
    .join(" · ");
}

export function buildEmergencyRoster(input: {
  tenantName: string;
  logoUrl?: string | null;
  orgNumber?: string | null;
  address?: string | null;
  scopeLabel: string;
  employees: EmergencyRosterEmployee[];
}): PdfReportConfig {
  const rows = [...input.employees]
    .sort((a, b) => {
      const department = (a.department ?? "").localeCompare(b.department ?? "", "nb");
      if (department !== 0) return department;
      return a.name.localeCompare(b.name, "nb");
    })
    .map((employee) => [
      employee.name,
      employee.phone?.trim() || "Mangler",
      [employee.department, employee.position].filter(Boolean).join(" · ") || "—",
      formatNextOfKin(employee.nextOfKin),
    ]);

  return {
    type: "formal",
    title: "Beredskapsfil",
    subtitle: input.scopeLabel,
    reportLabel: "Lederperm",
    tenant: {
      name: input.tenantName,
      orgNumber: input.orgNumber,
      address: input.address,
      logoUrl: input.logoUrl,
    },
    legalReference: "AML § 3-1 og § 5-2, internkontrollforskriften § 5 nr. 6",
    sections: [
      {
        title: "Slik brukes listen",
        legalRef: "AML § 5-2",
        content: [
          {
            type: "paragraph",
            text: "Listen ligger i lederens perm slik at pårørende kan nås ved en ulykke. Ring 113 ved personskade, 110 ved brann og 112 ved behov for politi. Ved alvorlig personskade eller dødsfall skal arbeidsgiver straks varsle politiet og Arbeidstilsynet. Ved dødsfall er det politiet som varsler pårørende.",
          },
          {
            type: "keyvalue",
            pairs: [
              ["Ambulanse", "113"],
              ["Brann", "110"],
              ["Politi", "112"],
              ["Legevakt", "116 117"],
              ["Arbeidstilsynet", "73 19 97 00"],
            ],
          },
        ],
      },
      {
        title: "Ansatte og pårørende",
        content:
          rows.length === 0
            ? [{ type: "paragraph", text: "Ingen ansatte er med i dette uttrekket." }]
            : [
                {
                  type: "table",
                  headers: ["Ansatt", "Telefon", "Avdeling og stilling", "Pårørende"],
                  rows,
                },
              ],
      },
    ],
  };
}
