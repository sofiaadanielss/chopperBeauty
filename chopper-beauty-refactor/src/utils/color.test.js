import { describe, expect, it } from "vitest";
import {
  classifyUndertone,
  describeSkinColor,
  getHueAngle,
  getLightingWarning,
  rgbToLab,
  smoothColor,
} from "./color";
import { HIGH_LIGHT_LIMIT, HUE_COOL_BELOW, HUE_WARM_ABOVE, LOW_LIGHT_LIMIT } from "../constants/config";

describe("rgbToLab", () => {
  it("convierte blanco puro a luminosidad ~100 y ejes a/b ~0", () => {
    const [lightness, labA, labB] = rgbToLab([255, 255, 255]);
    expect(lightness).toBeCloseTo(100, 0);
    expect(labA).toBeCloseTo(0, 0);
    expect(labB).toBeCloseTo(0, 0);
  });

  it("convierte negro puro a luminosidad 0", () => {
    const [lightness] = rgbToLab([0, 0, 0]);
    expect(lightness).toBeCloseTo(0, 5);
  });

  it("un rojo puro tiene el eje a positivo (hacia el rojo)", () => {
    const [, labA] = rgbToLab([255, 0, 0]);
    expect(labA).toBeGreaterThan(0);
  });
});

describe("getHueAngle", () => {
  it("devuelve 45° cuando a y b son iguales y positivos", () => {
    expect(getHueAngle(10, 10)).toBeCloseTo(45, 5);
  });
});

describe("classifyUndertone", () => {
  it("clasifica como frío por debajo del límite frío", () => {
    expect(classifyUndertone(HUE_COOL_BELOW - 1)).toBe("cool");
  });

  it("clasifica como cálido por encima del límite cálido", () => {
    expect(classifyUndertone(HUE_WARM_ABOVE + 1)).toBe("warm");
  });

  it("clasifica como neutro entre ambos límites (incluyendo los límites)", () => {
    expect(classifyUndertone(HUE_COOL_BELOW)).toBe("neutral");
    expect(classifyUndertone(HUE_WARM_ABOVE)).toBe("neutral");
  });
});

describe("describeSkinColor", () => {
  it("un tono dorado se clasifica como cálido", () => {
    expect(describeSkinColor([200, 160, 100]).undertone).toBe("warm");
  });

  it("un tono rosado se clasifica como frío", () => {
    expect(describeSkinColor([220, 170, 185]).undertone).toBe("cool");
  });

  it("incluye el color original y la luminosidad medida", () => {
    const result = describeSkinColor([200, 160, 100]);
    expect(result.rgb).toEqual([200, 160, 100]);
    expect(result.lightness).toBeGreaterThan(0);
  });
});

describe("smoothColor", () => {
  it("sin color anterior devuelve el color actual", () => {
    expect(smoothColor(null, [10, 20, 30])).toEqual([10, 20, 30]);
  });

  it("mezcla el color anterior y el actual según el peso", () => {
    expect(smoothColor([100, 100, 100], [0, 0, 0], 0.9)).toEqual([90, 90, 90]);
  });
});

describe("getLightingWarning", () => {
  it("avisa cuando hay poca luz", () => {
    expect(getLightingWarning(LOW_LIGHT_LIMIT - 1)).not.toBe("");
  });

  it("avisa cuando hay demasiada luz", () => {
    expect(getLightingWarning(HIGH_LIGHT_LIMIT + 1)).not.toBe("");
  });

  it("no avisa con luz adecuada", () => {
    expect(getLightingWarning(60)).toBe("");
  });
});
