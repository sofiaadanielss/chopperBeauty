import { describe, expect, it } from "vitest";
import { averagePatchesColor, getSamplePatches } from "./skinSampler";
import { SAMPLE_POINT_INDEXES } from "../constants/config";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const LANDMARK_COUNT = 478;

/** Crea 478 puntos falsos en el centro del cuadro, con los bordes de la cara separados. */
function buildFakeLandmarks() {
  const landmarks = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0.5, y: 0.5 }));
  landmarks[234] = { x: 0.3, y: 0.5 };
  landmarks[454] = { x: 0.7, y: 0.5 };
  return landmarks;
}

describe("getSamplePatches", () => {
  it("devuelve un parche por cada punto de muestreo", () => {
    const patches = getSamplePatches(buildFakeLandmarks(), VIDEO_WIDTH, VIDEO_HEIGHT);
    expect(patches).toHaveLength(SAMPLE_POINT_INDEXES.length);
  });

  it("mantiene todos los parches dentro del cuadro de video", () => {
    const landmarks = buildFakeLandmarks();
    landmarks[SAMPLE_POINT_INDEXES[0]] = { x: 0.999, y: 0.999 };
    const patches = getSamplePatches(landmarks, VIDEO_WIDTH, VIDEO_HEIGHT);
    for (const patch of patches) {
      expect(patch.x + patch.width).toBeLessThanOrEqual(VIDEO_WIDTH);
      expect(patch.y + patch.height).toBeLessThanOrEqual(VIDEO_HEIGHT);
    }
  });
});

describe("averagePatchesColor", () => {
  it("promedia el color de los píxeles de un parche", () => {
    // Dos píxeles RGBA: (100, 50, 0) y (200, 150, 100)
    const fakeContext = {
      getImageData: () => ({ data: new Uint8ClampedArray([100, 50, 0, 255, 200, 150, 100, 255]) }),
    };
    const color = averagePatchesColor(fakeContext, [{ x: 0, y: 0, width: 2, height: 1 }]);
    expect(color).toEqual([150, 100, 50]);
  });

  it("devuelve null si no hay parches", () => {
    expect(averagePatchesColor({}, [])).toBeNull();
  });
});
