import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSjaWeatherConditions,
  isSjaWeatherData,
} from "../../src/features/sja/lib/sja-weather";

test("formaterer værøyeblikksbilde med sted og arbeidsrelevante målinger", () => {
  const result = formatSjaWeatherConditions({
    displayName: "Drammen, Buskerud, Norge",
    current: {
      temp: 8,
      label: "Regn",
      windSpeed: 6,
      humidity: 82,
    },
  });

  assert.equal(result, "Regn, 8 °C, vind 6 m/s, luftfuktighet 82 % – Drammen, Buskerud");
});

test("utelater stedsseparator når stedsnavn mangler", () => {
  const result = formatSjaWeatherConditions({
    displayName: "",
    current: {
      temp: -2,
      label: "Snø",
      windSpeed: 3,
      humidity: 90,
    },
  });

  assert.equal(result, "Snø, -2 °C, vind 3 m/s, luftfuktighet 90 %");
});

test("avviser ufullstendige værdata fra eksternt API", () => {
  assert.equal(isSjaWeatherData({ displayName: "Oslo", current: { temp: 5 } }), false);
});
