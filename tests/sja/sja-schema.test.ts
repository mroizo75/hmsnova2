import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createSjaSchema,
  createSjaTemplateSchema,
} from "../../src/features/sja/schemas/sja.schema";

const tenantId = "ck1234567890123456789012";
const hazard = {
  activity: "Frakobling",
  hazard: "Utilsiktet innkobling",
  consequence: "Elektrisk støt",
  probability: 2,
  severity: 5,
  measures: "Lås og merk",
  sortOrder: 0,
};

describe("SJA-malvalidering", () => {
  it("godtar en komplett elektro-mal", () => {
    const result = createSjaTemplateSchema.safeParse({
      tenantId,
      name: "Frakoblet lavspenning",
      electricalWorkType: "DE_ENERGIZED",
      requiresSecondPerson: false,
      requiredCourseKeys: ["elektro-fse-grunnkurs"],
      hazards: [hazard],
    });

    assert.equal(result.success, true);
  });

  it("avviser mal uten farer", () => {
    const result = createSjaTemplateSchema.safeParse({
      tenantId,
      name: "Tom mal",
      hazards: [],
    });

    assert.equal(result.success, false);
  });
});

describe("SJA-innsending", () => {
  it("godtar elektroarbeid med arbeidsforutsetninger, unike deltakere og full sjekkliste", () => {
    const result = createSjaSchema.safeParse({
      tenantId,
      title: "Arbeid i tavle",
      workLocation: "Tavlerom",
      plannedDate: new Date("2026-10-01"),
      responsibleName: "Ola Nordmann",
      participants: "Ola Nordmann, Kari Nordmann",
      electricalWorkType: "HIGH_VOLTAGE",
      workMethod: "Arbeid etter koblingsordre",
      requiredEquipment: "Spenningsprøver og jordingsutstyr",
      requiredPpe: "Lysbuebekledning",
      personnelRequirements: "Årlig FSE og instruert personell",
      requiresSecondPerson: true,
      participantRecords: [
        {
          userId: tenantId,
          name: "Ola Nordmann",
          isExternal: false,
          competenceConfirmed: false,
        },
        {
          name: "Kari Nordmann",
          isExternal: true,
          competenceConfirmed: true,
        },
      ],
      fseChecklist: {
        riskAssessmentCompleted: true,
        workMethodSelected: true,
        equipmentAvailable: true,
        ppeSelected: true,
        personnelInstructed: true,
      },
      hazards: [hazard],
    });

    assert.equal(result.success, true);
  });

  it("avviser elektroarbeid uten fullført FSE-sjekkliste", () => {
    const result = createSjaSchema.safeParse({
      tenantId,
      title: "Arbeid i tavle",
      workLocation: "Tavlerom",
      plannedDate: new Date("2026-10-01"),
      responsibleName: "Ola Nordmann",
      participants: "Ola Nordmann",
      electricalWorkType: "NEAR_LIVE",
      participantRecords: [
        {
          userId: tenantId,
          name: "Ola Nordmann",
          isExternal: false,
          competenceConfirmed: false,
        },
      ],
      fseChecklist: { riskAssessmentCompleted: true },
      hazards: [hazard],
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "fseChecklist"));
    }
  });
});
