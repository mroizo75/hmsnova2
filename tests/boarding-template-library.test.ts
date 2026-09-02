import assert from "node:assert/strict";
import test from "node:test";
import {
  getBoardingTemplateLibrary,
  BOARDING_TEMPLATE_LIBRARY,
} from "../src/lib/boarding-template-library";

test("standardmaler inneholder onboarding og offboarding", () => {
  const keys = BOARDING_TEMPLATE_LIBRARY.map((template) => template.sourceKey);
  assert.equal(keys.includes("onboarding-standard"), true);
  assert.equal(keys.includes("offboarding-standard"), true);
});

test("alle lovpålagte oppgaver har hjemmel", () => {
  for (const template of BOARDING_TEMPLATE_LIBRARY) {
    const mandatory = template.tasks.filter((task) => task.severity === "MANDATORY");
    assert.equal(mandatory.length > 0, true, `${template.sourceKey} mangler lovpålagte oppgaver`);
    for (const task of mandatory) {
      assert.equal(task.isRequired, true);
      assert.ok(
        task.legalRef && task.legalRef.length > 0,
        `${task.sourceKey} er lovpålagt uten hjemmel`
      );
    }
  }
});

test("nyansatt-HMS bruker AML § 3-2, ikke § 3-5 som generell plikt", () => {
  const onboarding = BOARDING_TEMPLATE_LIBRARY.find(
    (template) => template.sourceKey === "onboarding-standard"
  );
  assert.ok(onboarding);
  const hmsIntro = onboarding.tasks.find((task) => task.sourceKey === "onb-hms-intro");
  assert.ok(hmsIntro?.legalRef?.includes("AML § 3-2"));
  assert.equal(hmsIntro?.legalRef?.includes("§ 3-5"), false);

  const leaderHms = onboarding.tasks.find((task) => task.sourceKey === "onb-leader-hms");
  assert.ok(leaderHms?.legalRef?.includes("AML § 3-5"));
  assert.equal(leaderHms?.severity, "RECOMMENDED");
});

test("bransjespesifikke oppgaver filtreres", () => {
  const office = getBoardingTemplateLibrary("office");
  const construction = getBoardingTemplateLibrary("construction");
  const officeOnboarding = office.find((template) => template.sourceKey === "onboarding-standard");
  const constructionOnboarding = construction.find(
    (template) => template.sourceKey === "onboarding-standard"
  );

  assert.equal(
    officeOnboarding?.tasks.some((task) => task.sourceKey === "onb-hms-kort"),
    false
  );
  assert.equal(
    constructionOnboarding?.tasks.some((task) => task.sourceKey === "onb-hms-kort"),
    true
  );
});
