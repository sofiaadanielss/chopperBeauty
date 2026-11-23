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
  it("converts pure white to lightness near 100 and color axes near zero", () => {
    const [lightness, labA, labB] = rgbToLab([255, 255, 255]);
    expect(lightness).toBeCloseTo(100, 0);
    expect(labA).toBeCloseTo(0, 0);
    expect(labB).toBeCloseTo(0, 0);
  });

  it("converts pure black to zero lightness", () => {
    const [lightness] = rgbToLab([0, 0, 0]);
    expect(lightness).toBeCloseTo(0, 5);
  });

  it("pure red has a positive red–green axis", () => {
    const [, labA] = rgbToLab([255, 0, 0]);
    expect(labA).toBeGreaterThan(0);
  });
});

describe("getHueAngle", () => {
  it("returns 45° when both axes are equal and positive", () => {
    expect(getHueAngle(10, 10)).toBeCloseTo(45, 5);
  });
});

describe("classifyUndertone", () => {
  it("classifies hues below the cool threshold as cool", () => {
    expect(classifyUndertone(HUE_COOL_BELOW - 1)).toBe("cool");
  });

  it("classifies hues above the warm threshold as warm", () => {
    expect(classifyUndertone(HUE_WARM_ABOVE + 1)).toBe("warm");
  });

  it("classifies the range including both thresholds as neutral", () => {
    expect(classifyUndertone(HUE_COOL_BELOW)).toBe("neutral");
    expect(classifyUndertone(HUE_WARM_ABOVE)).toBe("neutral");
  });
});

describe("describeSkinColor", () => {
  it("classifies a golden sample as warm", () => {
    expect(describeSkinColor([200, 160, 100]).undertone).toBe("warm");
  });

  it("classifies a pink sample as cool", () => {
    expect(describeSkinColor([220, 170, 185]).undertone).toBe("cool");
  });

  it("includes the original color and measured lightness", () => {
    const result = describeSkinColor([200, 160, 100]);
    expect(result.rgb).toEqual([200, 160, 100]);
    expect(result.lightness).toBeGreaterThan(0);
  });
});

describe("smoothColor", () => {
  it("returns the current color when a previous color is absent", () => {
    expect(smoothColor(null, [10, 20, 30])).toEqual([10, 20, 30]);
  });

  it("blends the frame colors according to the weight", () => {
    expect(smoothColor([100, 100, 100], [0, 0, 0], 0.9)).toEqual([90, 90, 90]);
  });
});

describe("getLightingWarning", () => {
  it("warns when measured lightness is low", () => {
    expect(getLightingWarning(LOW_LIGHT_LIMIT - 1)).not.toBe("");
  });

  it("warns when measured lightness is high", () => {
    expect(getLightingWarning(HIGH_LIGHT_LIMIT + 1)).not.toBe("");
  });

  it("returns no warning within the lightness range", () => {
    expect(getLightingWarning(60)).toBe("");
  });
});
